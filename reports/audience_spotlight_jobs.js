/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Return Campaign Manager Audience Spotlight Job Object
 * @param {string} firstpartyBQTableName Fully qualified table name for first
 * party audience segments. Can be an empty string.
 * @return {!Object} JobConfig Object
 */
function getCmAudSpotJob(firstpartyBQTableName) {
  return {
    queryName: 'CM_AUD_SPOT',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 1,
        queryParamName: 'cmAdvertiserIds',
      },
      {
        reportParamLoc: 2,
        queryParamName: 'cmCampaignIds',
      },
      {
        reportParamLoc: 3,
        queryParamName: 'cmActivityIds',
      },
      {
        reportParamLoc: 4,
        queryParamName: 'lookbackWindow',
      },
      {
        reportParamLoc: 6,
        queryParamName: 'reachThreshhold',
      },
    ],
    mergeParams: [
      {
        type: 'SUM',
        queryParamName: 'conversions',
      },
      {
        type: 'SUM',
        queryParamName: 'reach',
      },
      {
        type: 'SUM',
        queryParamName: 'impressions',
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign_name_str',
      },
    ],
    queryTxt: getCmQueryTxt_(firstpartyBQTableName),
  };
};

/**
 * Return DV360 Audience Spotlight Job Object
 * @param {string} firstpartyBQTableName Fully qualified table name for first
 * party audience segments. Can be an empty string.
 * @return {!Object} JobConfig Object
 */
function getDv360AudSpotJob(firstpartyBQTableName) {
  return {
    queryName: 'DV360_AUD_SPOT',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 1,
        queryParamName: 'dv360AdvertiserIds',
      },
      {
        reportParamLoc: 2,
        queryParamName: 'dv360CampaignIds',
      },
      {
        reportParamLoc: 3,
        queryParamName: 'cmActivityIds',
      },
      {
        reportParamLoc: 4,
        queryParamName: 'lookbackWindow',
      },
      {
        reportParamLoc: 6,
        queryParamName: 'reachThreshhold',
      },
    ],
    mergeParams: [
        {
          type: 'SUM',
          queryParamName: 'conversions',
        },
        {
          type: 'SUM',
          queryParamName: 'reach',
        },
        {
          type: 'SUM',
          queryParamName: 'impressions',
        },
        {
          type: 'CONSTANT',
          value: 'UNKNOWN',
          queryParamName: 'campaign_name_str',
        }
    ],
    queryTxt: getDv360QueryTxt_(firstpartyBQTableName),
  };
};

/**
 * Get query SQL for Campaign Manager job
 * @param {string} firstpartyBQTableName Fully qualified table name for first
 * party audience segments. Can be an empty string.
 * @return {string} SQL text
 */
function getCmQueryTxt_(firstpartyBQTableName) {
  var rawQueryTxt = `/** Step 1: Create match tables for Demographics, Affinity & In-Market using Google Ads data */

  ## For Demographics
  CREATE TABLE gads_user_demo AS (
    SELECT
      device_id_md5,
      demographics.age_group,
      demographics.gender,
      COUNT(device_id_md5) AS impression_count
    FROM
      adh.google_ads_impressions_rdid
    WHERE
      device_id_md5 != "0"
    GROUP BY 1, 2, 3
  );

  CREATE TABLE gads_user_demo_match AS (
    SELECT * FROM
    (
      SELECT
      device_id_md5,
      age_group_name,
      gender_name,
      ROW_NUMBER() OVER (PARTITION BY device_id_md5 ORDER BY age_group_name DESC, gender_name DESC) AS rownum
      FROM
              tmp.gads_user_demo gua
          LEFT JOIN adh.age_group AS ag
          ON ag.age_group_id = gua.age_group
          LEFT JOIN adh.gender AS gn
          ON gn.gender_id = gua.gender
      ) WHERE rownum = 1
  );


  ## For Affinity
  CREATE TABLE gads_user_aff AS (
    SELECT
      device_id_md5,
      demographics.age_group,
      demographics.gender,
      affinity_id,
      COUNT(device_id_md5) AS impression_count
    FROM
      adh.google_ads_impressions_rdid,
      UNNEST (affinity) AS affinity_id
    WHERE
      device_id_md5 != "0"
    GROUP BY 1, 2, 3, 4
  );

  CREATE TABLE gads_user_aff_match AS (
    SELECT
      device_id_md5,
      age_group_name,
      gender_name,
      affinity_name
    FROM
          tmp.gads_user_aff gua
        LEFT JOIN adh.affinity a
          ON a.affinity_id = gua.affinity_id
          LEFT JOIN adh.age_group AS ag
              ON ag.age_group_id = gua.age_group
          LEFT JOIN adh.gender AS gn
              ON gn.gender_id = gua.gender
  );

  ## For In-Market
  CREATE TABLE gads_user_inmn AS (
    SELECT
      device_id_md5,
      demographics.age_group,
      demographics.gender,
      in_market_id,
      COUNT(device_id_md5) AS impression_count
    FROM
      adh.google_ads_impressions_rdid,
      UNNEST (in_market) AS in_market_id
    WHERE
      device_id_md5 != "0"
    GROUP BY 1, 2, 3, 4
  );

  CREATE TABLE gads_user_inm_match AS (
    SELECT
      device_id_md5,
      age_group_name,
      gender_name,
      in_market_name
    FROM
          tmp.gads_user_inmn gui
        LEFT JOIN adh.in_market i
          ON i.in_market_id = gui.in_market_id
          LEFT JOIN adh.age_group AS ag
              ON ag.age_group_id = gui.age_group
          LEFT JOIN adh.gender AS gn
              ON gn.gender_id = gui.gender
  );

  /** Step 2.B: Get impressions from CM campaigns specified */
  WITH
  impressions_by_cm_campaigns AS
  (
  SELECT
    imp.device_id_md5 AS device_id_md5,
    imp.event.event_time AS event_time,
    CONCAT('Campaign ID: ',CAST(imp.event.campaign_id AS STRING)) AS campaign_id,
    COALESCE(cm_campaign_mt.campaign, 'Unknown') AS campaign_name,
    CONCAT('Campaign ID: ',CAST(imp.event.campaign_id AS STRING),' + ','Site ID: ',CAST(imp.event.site_id AS STRING)) AS breakdown_id,
    CONCAT(COALESCE(cm_campaign_mt.campaign, 'Unknown'), ' + ', COALESCE(cm_site_mt.site, 'Unknown')) AS breakdown_name,
    'CM' AS campaign_source,
    c.city AS city_name
  FROM adh.cm_dt_impressions_rdid imp
      LEFT JOIN adh.cm_dt_campaign cm_campaign_mt
        ON imp.event.campaign_id = cm_campaign_mt.campaign_id
    LEFT JOIN adh.cm_dt_site cm_site_mt
        ON imp.event.site_id = cm_site_mt.site_id
    LEFT JOIN adh.cm_dt_city c
        ON imp.event.city_id = c.city_id
  WHERE imp.device_id_md5 != "0"
    AND imp.event.advertiser_id IN UNNEST(@cmAdvertiserIds)
    AND imp.event.campaign_id IN UNNEST(@cmCampaignIds)
  ),

  /** Step 3: Obtain conversions for floodlight activities specified */
  cm_conversions AS
  (
    SELECT
      a.device_id_md5,
      a.event.event_time,
      a.event.activity_id,
      ac.activity,
    FROM
      adh.cm_dt_activities_rdid a
      LEFT JOIN adh.cm_dt_activity_category ac
          ON a.event.activity_id = ac.activity_id
    WHERE device_id_md5 <> '0'
      AND event.activity_id IN UNNEST(@cmActivityIds)
  ),

  /** Step 4: Derive impression count & conversion count per user at Campaign & Breakdown level. Apply lookback window for conversions */
  imp_conv_count_by_user_campaign_level AS
  (
    SELECT
      i.device_id_md5,
      campaign_source,
      campaign_id,
      campaign_name,
      CONCAT(CAST(c.activity_id AS STRING), " | ", c.activity) AS floodlight_activity,
      COUNT(DISTINCT i.event_time) AS impressions,
      COUNT(DISTINCT c.event_time) AS conversions
    FROM
      impressions_by_cm_campaigns AS i
    LEFT JOIN cm_conversions AS c
      ON i.device_id_md5 = c.device_id_md5
        AND c.event_time - i.event_time BETWEEN 0 AND (@lookbackWindow * 8.64e10)
    GROUP BY
      1, 2, 3, 4, 5
  ),

  imp_conv_count_by_user_breakdown_level AS
  (
    SELECT
      i.device_id_md5,
      campaign_source,
      breakdown_id AS campaign_id,
      breakdown_name AS campaign_name,
      CONCAT(CAST(c.activity_id AS STRING), " | ", c.activity) AS floodlight_activity,
      COUNT(DISTINCT i.event_time) AS impressions,
      COUNT(DISTINCT c.event_time) AS conversions
    FROM
      impressions_by_cm_campaigns AS i
    LEFT JOIN cm_conversions AS c
      ON i.device_id_md5 = c.device_id_md5
        AND c.event_time - i.event_time BETWEEN 0 AND (@lookbackWindow * 8.64e10)
    GROUP BY
      1, 2, 3, 4, 5
  ),

  usr_imp_conv_count_all AS
  (
    SELECT c.* FROM imp_conv_count_by_user_campaign_level c
    UNION ALL
    SELECT b.* FROM imp_conv_count_by_user_breakdown_level b
  ),

  /** Step 5: Match with 1P data to get audience segments */
  first_party_aud_segments AS
  (
    %s
  ),

  usr_imp_conv_count_segmented AS
  (
    SELECT
      u.device_id_md5,
      CONCAT(u.campaign_source, ' | ',  u.campaign_id) AS campaign_id_str,
        CONCAT(u.campaign_source, ' | ',  u.campaign_name) AS campaign_name_str,
      u.floodlight_activity,
      u.impressions,
      u.conversions,
      COALESCE(f.segment, "N/A") AS segment
    FROM
      usr_imp_conv_count_all u
      LEFT JOIN first_party_aud_segments f
          USING (device_id_md5)
  ),

  /** Step 6: Join above with demographics, affinity & in-market match tables created in Step 1 and calculate reach & conversion rate */
  demo_aggregate AS
  (
    SELECT
      'demographics' AS result_type,
           u.campaign_id_str,
      u.campaign_name_str,
      CASE
        WHEN u.impressions < 3 THEN CAST(u.impressions AS STRING)
        ELSE '3+'
      END AS exposure_level,
      u.floodlight_activity,
      u.segment,
        a.gender_name,
        a.age_group_name,
        'N/A' AS google_audience_name,
      COUNT(u.device_id_md5) AS reach,
      SUM(u.impressions) AS impressions,
      SUM(u.conversions) AS conversions
      FROM
        usr_imp_conv_count_segmented u
        LEFT JOIN tmp.gads_user_demo_match a
          USING (device_id_md5)
      GROUP BY
        1, 2, 3, 4, 5, 6, 7, 8, 9
  ),

  affinity_aggregate AS
  (
    SELECT
      'affinity' AS result_type,
           u.campaign_id_str,
      u.campaign_name_str,
      CASE
        WHEN u.impressions < 3 THEN CAST(u.impressions AS STRING)
        ELSE '3+'
      END AS exposure_level,
      u.floodlight_activity,
      u.segment,
        a.gender_name,
        a.age_group_name,
        a.affinity_name AS google_audience_name,
      COUNT(u.device_id_md5) AS reach,
      SUM(u.impressions) AS impressions,
      SUM(u.conversions) AS conversions
      FROM
        usr_imp_conv_count_segmented u
        LEFT JOIN tmp.gads_user_aff_match a
          USING (device_id_md5)
      GROUP BY
        1, 2, 3, 4, 5, 6, 7, 8, 9
  ),

  in_market_aggregate AS
  (
    SELECT
      'in_market' AS result_type,
           u.campaign_id_str,
      u.campaign_name_str,
      CASE
        WHEN u.impressions < 3 THEN CAST(u.impressions AS STRING)
        ELSE '3+'
      END AS exposure_level,
      u.floodlight_activity,
      u.segment,
        i.gender_name,
        i.age_group_name,
        i.in_market_name AS google_audience_name,
           COUNT(u.device_id_md5) AS reach,
      SUM(u.impressions) AS impressions,
      SUM(u.conversions) AS conversions
      FROM
        usr_imp_conv_count_segmented u
        LEFT JOIN tmp.gads_user_inm_match i
          USING (device_id_md5)
      GROUP BY
        1, 2, 3, 4, 5, 6, 7, 8, 9
  ),

  /** Step 7: Run all aggregate tables individually for final output. Ignore results where reach is less than 1000 for a given combination */
  final_output AS (
      SELECT * FROM demo_aggregate WHERE reach > (@reachThreshhold)
    UNION ALL
    SELECT * FROM affinity_aggregate WHERE reach > (@reachThreshhold)
    UNION ALL
    SELECT * FROM in_market_aggregate WHERE reach > (@reachThreshhold)
  )

  SELECT * FROM final_output;`;

  return Utilities.formatString(rawQueryTxt,
      getFirstpartyQueryTxt_(firstpartyBQTableName));
}

/**
 * Get query SQL for DV360 job
 * @param {string} firstpartyBQTableName Fully qualified table name for first
 * party audience segments. Can be an empty string.
 * @return {string} SQL text
 */
function getDv360QueryTxt_(firstpartyBQTableName){
  var rawQueryTxt = `/** Step 1: Create match tables for Demographics, Affinity & In-Market using Google Ads data */

  ## For Demographics
  CREATE TABLE gads_user_demo AS (
    SELECT
      device_id_md5,
      demographics.age_group,
      demographics.gender,
      COUNT(device_id_md5) AS impression_count
    FROM
      adh.google_ads_impressions_rdid
    WHERE
      device_id_md5 != "0"
    GROUP BY 1, 2, 3
  );

  CREATE TABLE gads_user_demo_match AS (
    SELECT * FROM
    (
      SELECT
      device_id_md5,
      age_group_name,
      gender_name,
      ROW_NUMBER() OVER (PARTITION BY device_id_md5 ORDER BY age_group_name DESC, gender_name DESC) AS rownum
      FROM
              tmp.gads_user_demo gua
      LEFT JOIN adh.age_group AS ag
      ON ag.age_group_id = gua.age_group
      LEFT JOIN adh.gender AS gn
      ON gn.gender_id = gua.gender
    ) WHERE rownum = 1
  );


  ## For Affinity
  CREATE TABLE gads_user_aff AS (
    SELECT
      device_id_md5,
      demographics.age_group,
      demographics.gender,
      affinity_id,
      COUNT(device_id_md5) AS impression_count
    FROM
      adh.google_ads_impressions_rdid,
      UNNEST (affinity) AS affinity_id
    WHERE
      device_id_md5 != "0"
    GROUP BY 1, 2, 3, 4
  );

  CREATE TABLE gads_user_aff_match AS (
    SELECT
      device_id_md5,
      age_group_name,
      gender_name,
      affinity_name
    FROM
          tmp.gads_user_aff gua
        LEFT JOIN adh.affinity a
          ON a.affinity_id = gua.affinity_id
          LEFT JOIN adh.age_group AS ag
              ON ag.age_group_id = gua.age_group
          LEFT JOIN adh.gender AS gn
              ON gn.gender_id = gua.gender
  );

  ## For In-Market
  CREATE TABLE gads_user_inmn AS (
    SELECT
      device_id_md5,
      demographics.age_group,
      demographics.gender,
      in_market_id,
      COUNT(device_id_md5) AS impression_count
    FROM
      adh.google_ads_impressions_rdid,
      UNNEST (in_market) AS in_market_id
    WHERE
      device_id_md5 != "0"
    GROUP BY 1, 2, 3, 4
  );

  CREATE TABLE gads_user_inm_match AS (
    SELECT
      device_id_md5,
      age_group_name,
      gender_name,
      in_market_name
    FROM
          tmp.gads_user_inmn gui
        LEFT JOIN adh.in_market i
          ON i.in_market_id = gui.in_market_id
          LEFT JOIN adh.age_group AS ag
              ON ag.age_group_id = gui.age_group
          LEFT JOIN adh.gender AS gn
              ON gn.gender_id = gui.gender
  );

  /** Step 2.A: Get impressions from DV360 campaigns specified */
  WITH
  trueview_impressions_from_dv360 AS
  (
  SELECT
      ti.device_id_md5 AS device_id_md5,
    ti.query_id.time_usec AS event_time,
    ti.location.geo_city_id AS city_id,
    ti.insertion_order_id AS dv360_insertion_order_id,
    ti.campaign_id AS dv360_campaign_id
  FROM adh.dv360_youtube_impressions_rdid ti
  WHERE ti.device_id_md5 != '0'
    AND ti.campaign_id IN UNNEST(@dv360CampaignIds)
    AND ti.advertiser_id IN UNNEST(@dv360AdvertiserIds)
  ),

  non_trueview_impressions_from_dv360 AS
  (
  SELECT
      nti.device_id_md5 AS device_id_md5,
    nti.event.event_time AS event_time,
    nti.event.dv360_city_id AS city_id,
    nti.event.dv360_insertion_order_id,
    nti.event.dv360_campaign_id
  FROM adh.dv360_dt_impressions_rdid nti
  WHERE nti.device_id_md5 != '0'
    AND nti.event.dv360_campaign_id IN UNNEST(@dv360CampaignIds)
    AND nti.event.dv360_advertiser_id IN UNNEST(@dv360AdvertiserIds)
  ),

  impressions_by_dv360_campaigns AS
  (
  SELECT
    imp.device_id_md5,
    imp.event_time,
    CONCAT('Campaign ID: ',CAST(imp.dv360_campaign_id AS STRING)) AS campaign_id,
    COALESCE(dv3_cmp_mt.dv360_campaign, 'Unknown') AS campaign_name,
    CONCAT('IO ID: ',CAST(imp.dv360_insertion_order_id AS STRING)) AS breakdown_id,
    COALESCE(dv3_io_mt.dv360_insertion_order, 'Unknown') AS breakdown_name,
    'DV360' AS campaign_source,
    c.city_name AS city_name
  FROM
    (
      SELECT ti.* FROM trueview_impressions_from_dv360 ti
      UNION ALL
      SELECT nti.* FROM non_trueview_impressions_from_dv360 nti
    ) imp
      LEFT JOIN adh.dv360_dt_campaign dv3_cmp_mt
        ON imp.dv360_campaign_id = dv3_cmp_mt.dv360_campaign_id
      LEFT JOIN adh.dv360_dt_insertion_order dv3_io_mt
        ON imp.dv360_insertion_order_id = dv3_io_mt.dv360_insertion_order_id
    LEFT JOIN adh.city c
        ON imp.city_id = c.city_id
  ),
  /** Step 3: Obtain conversions for floodlight activities specified */
  cm_conversions AS
  (
    SELECT
      a.device_id_md5,
      a.event.event_time,
      a.event.activity_id,
      ac.activity,
    FROM
      adh.cm_dt_activities_rdid a
      LEFT JOIN adh.cm_dt_activity_category ac
          ON a.event.activity_id = ac.activity_id
    WHERE device_id_md5 <> '0'
      AND event.activity_id IN UNNEST(@cmActivityIds)
  ),

  /** Step 4: Derive impression count & conversion count per user at Campaign & Breakdown level. Apply lookback window for conversions */
  imp_conv_count_by_user_campaign_level AS
  (
    SELECT
      i.device_id_md5,
      campaign_source,
      campaign_id,
      campaign_name,
      CONCAT(CAST(c.activity_id AS STRING), " | ", c.activity) AS floodlight_activity,
      COUNT(DISTINCT i.event_time) AS impressions,
      COUNT(DISTINCT c.event_time) AS conversions
    FROM
      impressions_by_dv360_campaigns AS i
    LEFT JOIN cm_conversions AS c
      ON i.device_id_md5 = c.device_id_md5
        AND c.event_time - i.event_time BETWEEN 0 AND (@lookbackWindow * 8.64e10)
    GROUP BY
      1, 2, 3, 4, 5
  ),

  imp_conv_count_by_user_breakdown_level AS
  (
    SELECT
      i.device_id_md5,
      campaign_source,
      breakdown_id AS campaign_id,
      breakdown_name AS campaign_name,
      CONCAT(CAST(c.activity_id AS STRING), " | ", c.activity) AS floodlight_activity,
      COUNT(DISTINCT i.event_time) AS impressions,
      COUNT(DISTINCT c.event_time) AS conversions
    FROM
      impressions_by_dv360_campaigns AS i
    LEFT JOIN cm_conversions AS c
      ON i.device_id_md5 = c.device_id_md5
        AND c.event_time - i.event_time BETWEEN 0 AND (@lookbackWindow * 8.64e10)
    GROUP BY
      1, 2, 3, 4, 5
  ),

  usr_imp_conv_count_all AS
  (
    SELECT c.* FROM imp_conv_count_by_user_campaign_level c
    UNION ALL
    SELECT b.* FROM imp_conv_count_by_user_breakdown_level b
  ),

  /** Step 5: Match with 1P data to get audience segments */
  first_party_aud_segments AS
  (
   %s
  ),

  usr_imp_conv_count_segmented AS
  (
    SELECT
      u.device_id_md5,
      CONCAT(u.campaign_source, ' | ',  u.campaign_id) AS campaign_id_str,
        CONCAT(u.campaign_source, ' | ',  u.campaign_name) AS campaign_name_str,
      u.floodlight_activity,
      u.impressions,
      u.conversions,
      COALESCE(f.segment, "N/A") AS segment
    FROM
      usr_imp_conv_count_all u
      LEFT JOIN first_party_aud_segments f
          USING (device_id_md5)
  ),

  /** Step 6: Join above with demographics, affinity & in-market match tables created in Step 1 and calculate reach & conversion rate */
  demo_aggregate AS
  (
    SELECT
      'demographics' AS result_type,
           u.campaign_id_str,
      u.campaign_name_str,
      CASE
        WHEN u.impressions < 3 THEN CAST(u.impressions AS STRING)
        ELSE '3+'
      END AS exposure_level,
      u.floodlight_activity,
      u.segment,
        a.gender_name,
        a.age_group_name,
        'N/A' AS google_audience_name,
      COUNT(u.device_id_md5) AS reach,
      SUM(u.impressions) AS impressions,
      SUM(u.conversions) AS conversions
      FROM
        usr_imp_conv_count_segmented u
        LEFT JOIN tmp.gads_user_demo_match a
          USING (device_id_md5)
      GROUP BY
        1, 2, 3, 4, 5, 6, 7, 8, 9
  ),

  affinity_aggregate AS
  (
    SELECT
      'affinity' AS result_type,
           u.campaign_id_str,
      u.campaign_name_str,
      CASE
        WHEN u.impressions < 3 THEN CAST(u.impressions AS STRING)
        ELSE '3+'
      END AS exposure_level,
      u.floodlight_activity,
      u.segment,
        a.gender_name,
        a.age_group_name,
        a.affinity_name AS google_audience_name,
      COUNT(u.device_id_md5) AS reach,
      SUM(u.impressions) AS impressions,
      SUM(u.conversions) AS conversions
      FROM
        usr_imp_conv_count_segmented u
        LEFT JOIN tmp.gads_user_aff_match a
          USING (device_id_md5)
      GROUP BY
        1, 2, 3, 4, 5, 6, 7, 8, 9
  ),

  in_market_aggregate AS
  (
    SELECT
      'in_market' AS result_type,
           u.campaign_id_str,
      u.campaign_name_str,
      CASE
        WHEN u.impressions < 3 THEN CAST(u.impressions AS STRING)
        ELSE '3+'
      END AS exposure_level,
      u.floodlight_activity,
      u.segment,
        i.gender_name,
        i.age_group_name,
        i.in_market_name AS google_audience_name,
           COUNT(u.device_id_md5) AS reach,
      SUM(u.impressions) AS impressions,
      SUM(u.conversions) AS conversions
      FROM
        usr_imp_conv_count_segmented u
        LEFT JOIN tmp.gads_user_inm_match i
          USING (device_id_md5)
      GROUP BY
        1, 2, 3, 4, 5, 6, 7, 8, 9
  ),

  /** Step 7: Run all aggregate tables individually for final output. Ignore results where reach is less than 1000 for a given combination */
  final_output AS (
      SELECT * FROM demo_aggregate WHERE reach > (@reachThreshhold)
    UNION ALL
    SELECT * FROM affinity_aggregate WHERE reach > (@reachThreshhold)
    UNION ALL
    SELECT * FROM in_market_aggregate WHERE reach > (@reachThreshhold)
  )

  SELECT * FROM final_output;`;

  return Utilities.formatString(rawQueryTxt,
      getFirstpartyQueryTxt_(firstpartyBQTableName));
}

/**
 * Get a first party audience segment subquery
 * Subquery is based on the fully qualified tablename. If no tablename then a
 * empty table is created and returned.
 * @param {string} firstpartyBQTableName Fully qualified table name for first
 * party audience segments. Can be an empty string.
 * @return {string} Subquery SQL text
 */
function getFirstpartyQueryTxt_(firstpartyBQTableName) {
  firstpartyBQTableName = firstpartyBQTableName.trim();

  return firstpartyBQTableName ?
      Utilities.formatString(`SELECT UPPER(TO_HEX(MD5(UPPER(device_id)))) AS
          device_id_md5, segment FROM ``%s`` GROUP BY 1, 2`,
          firstpartyBQTableName) :
      'SELECT CAST(NULL as STRING) AS device_id_md5, CAST(NULL as STRING) as segment';
}
