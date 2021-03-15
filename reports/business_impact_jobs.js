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
 * Returns Business Impact (Sales Lift) Analysis Job Object.
 * @param {string} firstpartyBQTableName Fully qualified table name for first
 * party audience segments. Can be an empty string.
 * @return {!Object} JobConfig Object
 */
function getBusinessImpactAnalysisJob(firstpartyBQTableName) {
  return {
    queryName: 'SALES_LIFT',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 0,
        queryParamName: 'cmAdvertiserIds'
      },
      {
        reportParamLoc: 1,
        queryParamName: 'cmCampaignIds'
      },
      {
        reportParamLoc: 2,
        queryParamName: 'cmSiteIds'
      },
      {
        reportParamLoc: 4,
        queryParamName: 'cutOffDate'
      },
      {
        reportParamLoc: 5,
        queryParamName: 'fpcStartDate'
      },
      {
        reportParamLoc: 6,
        queryParamName: 'fpcEndDate'
      },
      {
        reportParamLoc: 7,
        queryParamName: 'convLookbackWindow'
      }
    ],
    mergeParams: [
      {
        type: 'SUM',
        queryParamName: 'num_users'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'exposure_level'
      },
    ],
    queryTxt: Utilities.formatString(`/** Step 1: Get impressions from CM campaigns specified */
      WITH
      impressions_by_cm_campaigns AS
      (
        SELECT
          imp.device_id_md5 AS device_id_md5,
          imp.event.event_time AS event_time,
          COALESCE(cm_campaign_mt.campaign, 'Unknown') AS campaign
        FROM adh.cm_dt_impressions_rdid imp
          LEFT JOIN adh.cm_dt_campaign cm_campaign_mt
            ON imp.event.campaign_id = cm_campaign_mt.campaign_id
          LEFT JOIN adh.cm_dt_site cm_site_mt
            ON imp.event.site_id = cm_site_mt.site_id
        WHERE imp.device_id_md5 != '0'
          AND imp.event.advertiser_id IN UNNEST(@cmAdvertiserIds)
          AND imp.event.campaign_id IN UNNEST(@cmCampaignIds)
          AND imp.event.site_id IN UNNEST(@cmSiteIds)
      ),

      /** Step 2: Get first party conversion data (eg: transactions) */
      first_party_conversions AS
      (
        SELECT
          UPPER(TO_HEX(MD5(UPPER(device_id)))) AS device_id_md5,
          audience_segment,
          city,
          conversion_type,
          conversion_id,
          conversion_time,
          EXTRACT(DATE FROM conversion_time) AS conversion_date,
            UNIX_MILLIS(conversion_time) AS conversion_time_msecs,
          conversion_value
        FROM
          \`%s\`
        WHERE
          device_id IS NOT NULL
      ),

      fpc_in_scope AS
      (
        SELECT * FROM first_party_conversions WHERE conversion_date BETWEEN @fpcStartDate AND @fpcEndDate
      ),

      /** Step 3: Join first party data with campaign impressions. Determine campaign exposures before the conversion event occured. Segment conversions as pre/post */
      impressions_fpc_match AS
      (
        SELECT
          fpc.*,
          MIN(icc.event_time) AS first_exp_time,
          SUM(IF(icc.event_time IS NOT NULL AND fpc.conversion_time_msecs > icc.event_time AND fpc.conversion_time_msecs - icc.event_time <= @convLookbackWindow, 1, 0)) AS exposures_pre_conversion,
          CASE
          WHEN ((MIN(icc.event_time) IS NULL AND conversion_date < @cutOffDate) OR fpc.conversion_time_msecs < MIN(icc.event_time) OR fpc.conversion_time_msecs - MIN(icc.event_time) > @convLookbackWindow) THEN 'pre'
          ELSE 'post'
          END AS pre_post
        FROM fpc_in_scope fpc
        LEFT JOIN impressions_by_cm_campaigns icc
        ON icc.device_id_md5 = fpc.device_id_md5
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
      ),

      /** Step 3: Calculate number of conversions and conversion value in both pre & post */
      fpc_matched_by_device_id AS
      (
        SELECT
          device_id_md5,
          audience_segment,
          city,
          conversion_type,
          first_exp_time,
          MAX(exposures_pre_conversion) AS num_exposures,
          IF(first_exp_time IS NULL, DATE_DIFF(@cutOffDate, @fpcStartDate, DAY), CEIL((first_exp_time - UNIX_MICROS(TIMESTAMP(@fpcStartDate,"Asia/Kolkata")))/8.64e10)) AS pre_period,
          IF(first_exp_time IS NULL, DATE_DIFF(@fpcEndDate, @cutOffDate, DAY), CEIL((UNIX_MICROS(TIMESTAMP(@fpcEndDate,"Asia/Kolkata")) - first_exp_time)/8.64e10)) AS post_period,
          SUM(IF(pre_post = 'pre', 1, 0)) AS num_conversions_pre,
          SUM(IF(pre_post = 'post', 1, 0)) AS num_conversions_post,
          SUM(IF(pre_post = 'pre', conversion_value, 0)) AS conversion_value_pre,
          SUM(IF(pre_post = 'post', conversion_value, 0)) AS conversion_value_post
        FROM
          impressions_fpc_match
        GROUP BY
          1, 2, 3, 4, 5, 7, 8
      ),

      fpc_matched_with_avg_daily_freq AS
      (
        SELECT
          *,
          IF(pre_period = 0, 0, num_conversions_pre/(pre_period)) AS avg_daily_conversions_pre,
          IF(post_period = 0, 0, num_conversions_post/(post_period)) AS avg_daily_conversions_post,
        FROM
          fpc_matched_by_device_id
      ),

      /** Step 4: Aggregate results by exposure level */
      fpc_matched_aggregate AS
      (
        SELECT
          audience_segment,
          city,
          conversion_type,
          CASE
            WHEN num_exposures IS NULL OR num_exposures = 0 THEN '0'
            WHEN num_exposures < 6 THEN CAST(num_exposures AS STRING)
            ELSE '6+'
          END AS exposure_level,
          COUNT(device_id_md5) AS num_users,
          SUM(num_conversions_pre) AS agg_num_conversions_pre,
          SUM(num_conversions_post) AS agg_num_conversions_post,
          SUM(avg_daily_conversions_pre) / COUNT(device_id_md5) AS agg_avg_daily_conversions_pre,
          SUM(avg_daily_conversions_post) / COUNT(device_id_md5) AS agg_avg_daily_conversions_post,
          SUM(conversion_value_pre) AS agg_conversion_value_pre,
          SUM(conversion_value_post) AS agg_conversion_value_post
        FROM
          fpc_matched_with_avg_daily_freq
        GROUP BY
          1, 2, 3, 4
      )

      SELECT * FROM fpc_matched_aggregate ORDER BY 1, 2, 3, 4;`, firstpartyBQTableName.trim())
  };
};
