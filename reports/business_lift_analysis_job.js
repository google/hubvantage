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
 * Returns Brand Lift Analysis Job Object.
 * @return {!Object} JobConfig Object
 */
function getBrandLiftJob() {
  return {
    queryName: 'BRAND_LIFT',
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
        reportParamLoc: 3,
        queryParamName: 'surveyAdvertiserId'
      },
      {
        reportParamLoc: 4,
        queryParamName: 'surveyCampaignId'
      },
      {
        reportParamLoc: 5,
        queryParamName: 'exposureLevel'
      }
    ],
    mergeParams: [
      {
        type: 'SUM',
        queryParamName: 'exposes_selections'
      },
      {
        type: 'SUM',
        queryParamName: 'total_selections'
      },
      {
        type: 'SUM',
        queryParamName: 'control_selections'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'segment'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'survey_title'
      }
    ],
    queryTxt: `/** Step 1: Get impressions from CM campaigns specified */
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

      /** Step 2. Get all brand survey impressions */
      brand_survey_impressions AS
      (
        SELECT
          imp.device_id_md5 AS device_id_md5,
          p.placement AS survey_title,
          imp.event.impression_id AS survey_id,
          imp.event.event_time AS survey_time,
          c.city AS city
        FROM
          adh.cm_dt_impressions_rdid imp
          LEFT JOIN adh.cm_dt_placement p
            ON p.placement_id = imp.event.placement_id
          LEFT JOIN adh.cm_dt_city c
            ON c.city_id = imp.event.city_id
        WHERE
          imp.device_id_md5 != '0'
          AND imp.event.advertiser_id = @surveyAdvertiserId
          AND imp.event.campaign_id = @surveyCampaignId
      ),

      /** Step 3. Join brand survey impressions with campaign impressions to classify surveys based on exposure level */
      brand_surveys_segmented AS
      (
        SELECT
          s.*,
          MIN(i.event_time) AS first_exposure_time,
          CASE
            WHEN COUNTIF(i.event_time <= s.survey_time) = 0 THEN 'control'
            WHEN COUNTIF(i.event_time <= s.survey_time) >= @exposureLevel THEN 'expose'
            ELSE 'discard'
          END AS segment,
          ARRAY_TO_STRING(
              ARRAY_AGG(
                CASE
                  WHEN i.event_time <= s.survey_time THEN i.campaign
                  ELSE NULL
                END
              ),
            ';'
          ) AS campaigns_exposed
        FROM
          brand_survey_impressions s
          LEFT JOIN impressions_by_cm_campaigns i
            ON s.device_id_md5 = i.device_id_md5
        GROUP BY
          1, 2, 3, 4, 5
      ),

      brand_surveys_segmented_ranked AS
      (
        SELECT
          s.*,
          RANK() OVER (PARTITION BY s.device_id_md5, s.segment ORDER BY s.survey_time) AS rank_value
        FROM
          brand_surveys_segmented s
      ),

      /** Step 4. Get responses from rich media events for each survey */
      brand_survey_responses AS
      (
        SELECT
          s.*,
          SUBSTR(rm_mt.rich_media_event_name, 1, 2) AS question_id,
          SUBSTR(rm_mt.rich_media_event_name, 3, 2) AS option_id,
          MOD(rm.event.rich_media_event_counters, 2) AS is_selected,
          rm.event.event_time AS interaction_time
        FROM
          brand_surveys_segmented_ranked s
          JOIN adh.cm_dt_rich_media_rdid rm
            ON s.survey_id = rm.event.impression_id
            AND s.device_id_md5 = rm.device_id_md5
          JOIN adh.cm_dt_custom_rich_media rm_mt
            ON rm.event.rich_media_event_id = rm_mt.rich_media_event_id
            AND rm.event.rich_media_event_type_id = rm_mt.rich_media_event_type_id
        WHERE
          s.rank_value = 1 #De-duplicate: Consider only the first survey responded by each user in each segment
          AND rm_mt.rich_media_event_type = 'Counter'
      ),

      /** Step 5. Determine aggregate number of responses for each question/option selection*/
      overall_responses AS
      (
      SELECT
        'All Surveys' AS survey_title,
        'All Cities' AS city,
         sr.question_id,
        sr.option_id,
        SUM(IF(sr.segment = 'control',1,null)) AS control_responses,
        SUM(IF(sr.segment = 'control' AND sr.is_selected = 1,1,null)) AS control_selections,
        SUM(IF(sr.segment = 'expose',1,null)) AS expose_responses,
        SUM(IF(sr.segment = 'expose' AND sr.is_selected = 1,1,null)) AS expose_selections,
        COUNT(sr.device_id_md5) AS total_responses,
        COUNTIF(sr.is_selected = 1) AS total_selections
      FROM
        brand_survey_responses sr
      GROUP BY 1, 2, 3, 4
      ),

      breakdown_city_responses AS
      (
      SELECT
        'All Surveys' AS survey_title,
        sr.city,
         sr.question_id,
        sr.option_id,
        SUM(IF(sr.segment = 'control',1,null)) AS control_responses,
        SUM(IF(sr.segment = 'control' AND sr.is_selected = 1,1,null)) AS control_selections,
        SUM(IF(sr.segment = 'expose',1,null)) AS expose_responses,
        SUM(IF(sr.segment = 'expose' AND sr.is_selected = 1,1,null)) AS expose_selections,
        COUNT(sr.device_id_md5) AS total_responses,
        COUNTIF(sr.is_selected = 1) AS total_selections
      FROM
        brand_survey_responses sr
      GROUP BY 1, 2, 3, 4
      ),

      breakdown_survey_responses AS
      (
      SELECT
        sr.survey_title,
        'All Cities' AS city,
         sr.question_id,
        sr.option_id,
        SUM(IF(sr.segment = 'control',1,null)) AS control_responses,
        SUM(IF(sr.segment = 'control' AND sr.is_selected = 1,1,null)) AS control_selections,
        SUM(IF(sr.segment = 'expose',1,null)) AS expose_responses,
        SUM(IF(sr.segment = 'expose' AND sr.is_selected = 1,1,null)) AS expose_selections,
        COUNT(sr.device_id_md5) AS total_responses,
        COUNTIF(sr.is_selected = 1) AS total_selections
      FROM
        brand_survey_responses sr
      GROUP BY 1, 2, 3, 4
      ),

      breakdown_survey_and_city_responses AS
      (
      SELECT
        sr.survey_title,
        sr.city,
         sr.question_id,
        sr.option_id,
        SUM(IF(sr.segment = 'control',1,null)) AS control_responses,
        SUM(IF(sr.segment = 'control' AND sr.is_selected = 1,1,null)) AS control_selections,
        SUM(IF(sr.segment = 'expose',1,null)) AS expose_responses,
        SUM(IF(sr.segment = 'expose' AND sr.is_selected = 1,1,null)) AS expose_selections,
        COUNT(sr.device_id_md5) AS total_responses,
        COUNTIF(sr.is_selected = 1) AS total_selections
      FROM
        brand_survey_responses sr
      GROUP BY 1, 2, 3, 4
      )

      SELECT * FROM overall_responses
      UNION ALL
      SELECT * FROM breakdown_city_responses
      UNION ALL
      SELECT * FROM breakdown_survey_responses
      UNION ALL
      SELECT * FROM breakdown_survey_and_city_responses;`
  }
};
