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
const PATHING_ANALYSIS_QUERY_TEMPLATE = `
WITH trunc_paths AS (
  SELECT
    adh_paths.user_id,
    __DYNAMIC_REPORTING_GROUPING_TAG__
     paths.event_time,
    CASE WHEN conv_flag = 1 THEN 1 ELSE 0 END as conv_flag,
    ROW_NUMBER() OVER(PARTITION BY adh_paths.user_id ORDER BY paths.event_time DESC) AS touch_num
  FROM
    adh.cm_paths adh_paths,
  UNNEST(adh_paths.path.events) AS paths
  LEFT JOIN (
    SELECT
      user_id,
      min(cm_pths.event_time) AS first_floodlight_time,
      1 AS conv_flag
    FROM
      adh.cm_paths,
    UNNEST(cm_paths.path.events) AS cm_pths
    WHERE
      cm_pths.event_type = "FLOODLIGHT"
      AND cm_pths.activity_id IN UNNEST(@activity_ids)
      AND user_id <> "0"
      AND user_id IS NOT NULL
    GROUP BY
      1) z
  ON adh_paths.user_id = z.user_id
  LEFT JOIN (select distinct site_id, site from adh.cm_dt_site) site_mt
    ON paths.site_id = site_mt.site_id
  LEFT JOIN (select distinct placement_id, placement from adh.cm_dt_placement) plcm
    ON paths.placement_ID = plcm.placement_id
  LEFT JOIN (select distinct campaign_id, campaign from adh.cm_dt_campaign) camp
    ON paths.campaign_ID = camp.campaign_id
  LEFT JOIN (SELECT advertiser, advertiser_id FROM adh.cm_dt_advertiser ) AS advertiser_mt
    USING (advertiser_id)
  LEFT JOIN (SELECT browser_platform,browser_platform_id FROM adh.cm_dt_browser) AS browser_mt
    ON cast(paths.browser_platform_id as string) = cast(browser_mt.browser_platform_id as string)
  LEFT JOIN (SELECT dma_region,dma_region_id FROM adh.cm_dt_designated_market_area) AS dma_mt
    ON paths.dma_region_id = dma_mt.dma_region_id

  WHERE
    (paths.event_time <= IFNULL(first_floodlight_time,0)
    OR first_floodlight_time IS NULL)
    AND adh_paths.user_id <> "0"
    AND adh_paths.user_id IS NOT NULL
    AND paths.event_type <> "FLOODLIGHT"
    __DYNAMIC_REPORTING_FILTERS_TAG__
  )
  SELECT
    full_path,
    SUM(conv_flag) as conversions,
    COUNT(conv_flag) as total_paths,
    SUM(conv_flag)/COUNT(conv_flag) as conv_rate
  FROM (
    SELECT
      user_id,
      STRING_AGG(__DYNAMIC_REPORTING__SET_NAME_TAG__," >> " ORDER BY event_time asc) as full_path,
      max(conv_flag) as conv_flag
    FROM
      trunc_paths
    WHERE
      touch_num <= if(@path_length = 0, 25, @path_length)
    GROUP BY
      user_id)
  GROUP BY
    full_path
  ORDER BY
    conv_rate DESC
  ;
`;
