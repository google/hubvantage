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
 * Returns Campaign Manager City Level Reach and Frequency Analysis Job Object.
 * @return {!Object} JobConfig Object
 */
function getCmRnFCityJob() {
  return {
    queryName: 'CM_RNF_CITY_WISE',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 1,
        queryParamName: 'cmAdvertiserIds'
      },
      {
        reportParamLoc: 2,
        queryParamName: 'cmCampaignIds'
      }
    ],
    mergeParams: [
      {
        type: 'SUM',
        queryParamName: 'unique_reach'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign_id_str'
      }
    ],
    queryTxt: `/** Step 1.B: Get impressions from CM campaigns specified */
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
        WHERE imp.device_id_md5 != '0'
          AND imp.event.advertiser_id IN UNNEST(@cmAdvertiserIds)
          AND imp.event.campaign_id IN UNNEST(@cmCampaignIds)
        ),

        /** Step 2: Group to user level and calculate impressions per user at campaign & breakdown level */
        imp_count_by_user_campaign_level AS
        (
        SELECT
          device_id_md5,
          campaign_source,
          campaign_id,
          campaign_name,
          city_name,
          COUNT(device_id_md5) AS impressions
        FROM
          impressions_by_cm_campaigns
        #   impressions_by_dv360_campaigns
        GROUP BY 1, 2, 3, 4, 5
        ),

        imp_count_by_user_breakdown_level AS
        (
        SELECT
          device_id_md5,
          campaign_source,
          breakdown_id AS campaign_id,
          breakdown_name AS campaign_name,
          city_name,
          COUNT(device_id_md5) AS impressions
        FROM
          impressions_by_cm_campaigns
        #   impressions_by_dv360_campaigns
        GROUP BY 1, 2, 3, 4, 5
        ),

        imp_count_by_user_all AS
        (
          SELECT * FROM imp_count_by_user_campaign_level
          UNION ALL
          SELECT * FROM imp_count_by_user_breakdown_level
        ),

        imp_count_by_user_condensed AS
        (
          SELECT
              device_id_md5,
            CONCAT(campaign_source, ' | ',  campaign_id) AS campaign_id_str,
              CONCAT(campaign_source, ' | ',  campaign_name) AS campaign_name_str,
              city_name,
              impressions
            FROM
              imp_count_by_user_all
        )

        /** Step 3: Reach by Exposure Level i.e. Frequency */
        SELECT
          campaign_id_str,
          campaign_name_str,
          city_name,
          CASE
            WHEN impressions < 6 THEN CAST(impressions AS STRING)
            ELSE '6+'
          END AS exposure_level,
          COUNT(device_id_md5) AS unique_reach
        FROM imp_count_by_user_condensed
        GROUP BY 1, 2, 3, 4
        ;`
  };
}

/**
 * Returns Campaign Manager Reach Overlap Job Object.
 * @return {!Object} JobConfig Object
 */
function getCmRnFOverlapJob() {
  return {
    queryName: 'CM_RNF_OVERLAP',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 1,
        queryParamName: 'cmAdvertiserIds'
      },
      {
        reportParamLoc: 2,
        queryParamName: 'cmCampaignIds'
      }
    ],
    mergeParams: [
      {
        type: 'SUM',
        queryParamName: 'reach_overlap'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign1'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign2'
      }
    ],
    queryTxt: `/** Step 1.B: Get impressions from CM campaigns specified */
        WITH impressions_by_cm_campaigns AS
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
        WHERE imp.device_id_md5 != '0'
          AND imp.event.advertiser_id IN UNNEST(@cmAdvertiserIds)
          AND imp.event.campaign_id IN UNNEST(@cmCampaignIds)
        ),

        /** Step 2: Group to user level and calculate impressions per user at campaign & breakdown level */
        imp_count_by_user_campaign_level AS
        (
        SELECT
          device_id_md5,
          campaign_source,
          campaign_id,
          campaign_name,
          COUNT(device_id_md5) AS impressions
        FROM
        #   impressions_by_dv360_campaigns
          impressions_by_cm_campaigns
        GROUP BY 1, 2, 3, 4
        ),

        imp_count_by_user_breakdown_level AS
        (
        SELECT
          device_id_md5,
          campaign_source,
          breakdown_id AS campaign_id,
          breakdown_name AS campaign_name,
          COUNT(device_id_md5) AS impressions
        FROM
        #   impressions_by_dv360_campaigns
          impressions_by_cm_campaigns
        GROUP BY 1, 2, 3, 4
        ),

        imp_count_by_user_all AS
        (
          SELECT * FROM imp_count_by_user_campaign_level
          UNION ALL
          SELECT * FROM imp_count_by_user_breakdown_level
        ),

        imp_count_by_user_condensed AS
        (
          SELECT
              device_id_md5,
            CONCAT(campaign_source, ' | ',  campaign_id) AS campaign_id_str,
              CONCAT(campaign_source, ' | ',  campaign_name) AS campaign_name_str,
              impressions
            FROM
              imp_count_by_user_all
        )

        /** Step 3: Do self-join to get overlaps between any 2 campaigns. NOTE: Overlap of A:A is total reach and not exclusive reach */
        SELECT
          c1.campaign_id_str AS campaign1,
          c1.campaign_name_str AS campaign1_name,
          c2.campaign_id_str AS campaign2,
          c2.campaign_name_str AS campaign2_name,
          COUNT(DISTINCT c1.device_id_md5) AS reach_overlap
        FROM
          imp_count_by_user_condensed c1
          JOIN imp_count_by_user_condensed c2
              ON c1.device_id_md5 = c2.device_id_md5
        GROUP BY
          1, 2, 3, 4
        ;`
  };
}

/**
 * Returns DV360 City Level Reach and Frequency Analysis Job Object.
 * @return {!Object} JobConfig Object
 */
function getDV360RnFCityJob() {
  return {
    queryName: 'DV360_RNF_CITY_WISE',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 1,
        queryParamName: 'dv360AdvertiserIds'
      },
      {
        reportParamLoc: 2,
        queryParamName: 'dv360CampaignIds'
      }
    ],
    mergeParams: [
      {
        type: 'SUM',
        queryParamName: 'unique_reach'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign_id_str'
      }
    ],
    queryTxt: `/** Step 1.A: Get impressions from DV360 campaigns specified */
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
        imp_count_by_user_campaign_level AS
        (
        SELECT
          device_id_md5,
          campaign_source,
          campaign_id,
          campaign_name,
          city_name,
          COUNT(device_id_md5) AS impressions
        FROM
          #impressions_by_cm_campaigns
          impressions_by_dv360_campaigns
        GROUP BY 1, 2, 3, 4, 5
        ),

        imp_count_by_user_breakdown_level AS
        (
        SELECT
          device_id_md5,
          campaign_source,
          breakdown_id AS campaign_id,
          breakdown_name AS campaign_name,
          city_name,
          COUNT(device_id_md5) AS impressions
        FROM
          #impressions_by_cm_campaigns
          impressions_by_dv360_campaigns
        GROUP BY 1, 2, 3, 4, 5
        ),

        imp_count_by_user_all AS
        (
          SELECT * FROM imp_count_by_user_campaign_level
          UNION ALL
          SELECT * FROM imp_count_by_user_breakdown_level
        ),

        imp_count_by_user_condensed AS
        (
          SELECT
              device_id_md5,
            CONCAT(campaign_source, ' | ',  campaign_id) AS campaign_id_str,
              CONCAT(campaign_source, ' | ',  campaign_name) AS campaign_name_str,
              city_name,
              impressions
            FROM
              imp_count_by_user_all
        )

        /** Step 3: Reach by Exposure Level i.e. Frequency */
        SELECT
          campaign_id_str,
          campaign_name_str,
          city_name,
          CASE
            WHEN impressions < 6 THEN CAST(impressions AS STRING)
            ELSE '6+'
          END AS exposure_level,
          COUNT(device_id_md5) AS unique_reach
        FROM imp_count_by_user_condensed
        GROUP BY 1, 2, 3, 4
        ;`
  };
}

/**
 * Returns DV360 Reach Overlap Job Object.
 * @return {!Object} JobConfig Object
 */
function getDV360RnFOverlapJob() {
  return {
    queryName: 'DV360_RNF_OVERLAP',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 1,
        queryParamName: 'dv360AdvertiserIds'
      },
      {
        reportParamLoc: 2,
        queryParamName: 'dv360CampaignIds'
      }
    ],
    mergeParams: [
      {
        type: 'SUM',
        queryParamName: 'reach_overlap'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign1'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign2'
      }
    ],
    queryTxt: `/** Step 1.A: Get impressions from DV360 campaigns specified */
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
        imp_count_by_user_campaign_level AS
        (
        SELECT
          device_id_md5,
          campaign_source,
          campaign_id,
          campaign_name,
          COUNT(device_id_md5) AS impressions
        FROM
          impressions_by_dv360_campaigns
          #impressions_by_cm_campaigns
        GROUP BY 1, 2, 3, 4
        ),

        imp_count_by_user_breakdown_level AS
        (
        SELECT
          device_id_md5,
          campaign_source,
          breakdown_id AS campaign_id,
          breakdown_name AS campaign_name,
          COUNT(device_id_md5) AS impressions
        FROM
          impressions_by_dv360_campaigns
          #impressions_by_cm_campaigns
        GROUP BY 1, 2, 3, 4
        ),

        imp_count_by_user_all AS
        (
          SELECT * FROM imp_count_by_user_campaign_level
          UNION ALL
          SELECT * FROM imp_count_by_user_breakdown_level
        ),

        imp_count_by_user_condensed AS
        (
          SELECT
              device_id_md5,
            CONCAT(campaign_source, ' | ',  campaign_id) AS campaign_id_str,
              CONCAT(campaign_source, ' | ',  campaign_name) AS campaign_name_str,
              impressions
            FROM
              imp_count_by_user_all
        )

        /** Step 3: Do self-join to get overlaps between any 2 campaigns. NOTE: Overlap of A:A is total reach and not exclusive reach */
        SELECT
          c1.campaign_id_str AS campaign1,
          c1.campaign_name_str AS campaign1_name,
          c2.campaign_id_str AS campaign2,
          c2.campaign_name_str AS campaign2_name,
          COUNT(DISTINCT c1.device_id_md5) AS reach_overlap
        FROM
          imp_count_by_user_condensed c1
          JOIN imp_count_by_user_condensed c2
              ON c1.device_id_md5 = c2.device_id_md5
        GROUP BY
          1, 2, 3, 4
        ;`
  };
}
