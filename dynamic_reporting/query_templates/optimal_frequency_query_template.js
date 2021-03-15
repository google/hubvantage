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
const OPTIMAL_FREQUENCY_QUERY_TEMPLATE = `
with conversion_by_activity_ID as (
  select
  user_ID,
  event.Event_Time as activity_time,
  __DYNAMIC_REPORTING_GROUPING_TAG__
  count(*) as conversions
  from adh.cm_dt_activities activity

  LEFT JOIN (SELECT advertiser, advertiser_id FROM adh.cm_dt_advertiser ) AS advertiser_mt
  ON activity.event.advertiser_id = advertiser_mt.advertiser_id
  LEFT JOIN (SELECT campaign,campaign_id FROM adh.cm_dt_campaign ) AS campaign_mt
  ON activity.event.campaign_id = campaign_mt.campaign_id
  LEFT JOIN (SELECT placement,placement_id FROM adh.cm_dt_placement) AS placement_mt
  ON activity.event.placement_id = placement_mt.placement_id
  LEFT JOIN (SELECT site,site_id FROM adh.cm_dt_site) AS site_mt
  ON activity.event.site_id = site_mt.site_id
  LEFT JOIN (SELECT browser_platform,browser_platform_id FROM adh.cm_dt_browser) AS browser_mt
  ON cast(activity.event.browser_platform_id as string) = cast(browser_mt.browser_platform_id as string)
  LEFT JOIN (SELECT dma_region,dma_region_id FROM adh.cm_dt_designated_market_area) AS dma_mt
  ON activity.event.dma_region_id = dma_mt.dma_region_id

  where User_ID != '0'
  __DYNAMIC_REPORTING_FILTERS_TAG__
  and event.activity_id IN UNNEST(@activity_ids)
  group by 1,2 ,__DYNAMIC_REPORTING__SET_NAME_TAG__

  ),

 impressions_by_custom_grouping AS (
  SELECT
    user_id,
    __DYNAMIC_REPORTING_GROUPING_TAG__
    event.event_time AS Interaction_Time,
  FROM adh.cm_dt_impressions imp

  LEFT JOIN (SELECT advertiser, advertiser_id FROM adh.cm_dt_advertiser ) AS advertiser_mt
  ON imp.event.advertiser_id = advertiser_mt.advertiser_id
  LEFT JOIN (SELECT campaign,campaign_id FROM adh.cm_dt_campaign ) AS campaign_mt
  ON imp.event.campaign_id = campaign_mt.campaign_id
  LEFT JOIN (SELECT placement,placement_id FROM adh.cm_dt_placement) AS placement_mt
  ON imp.event.placement_id = placement_mt.placement_id
  LEFT JOIN (SELECT site,site_id FROM adh.cm_dt_site) AS site_mt
  ON imp.event.site_id = site_mt.site_id
  LEFT JOIN (SELECT browser_platform,browser_platform_id FROM adh.cm_dt_browser) AS browser_mt
  ON cast(imp.event.browser_platform_id as string) = cast(browser_mt.browser_platform_id as string)
  LEFT JOIN (SELECT dma_region,dma_region_id FROM adh.cm_dt_designated_market_area) AS dma_mt
  ON imp.event.dma_region_id = dma_mt.dma_region_id

  WHERE user_id != "0"
  __DYNAMIC_REPORTING_FILTERS_TAG__
),

clicks_by_custom_grouping AS (
  SELECT
    user_id,
    __DYNAMIC_REPORTING_GROUPING_TAG__
    event.event_time AS Interaction_Time,
  FROM adh.cm_dt_clicks clicks

  LEFT JOIN (SELECT advertiser, advertiser_id FROM adh.cm_dt_advertiser ) AS advertiser_mt
  ON clicks.event.advertiser_id = advertiser_mt.advertiser_id
  LEFT JOIN (SELECT campaign,campaign_id FROM adh.cm_dt_campaign ) AS campaign_mt
  ON clicks.event.campaign_id = campaign_mt.campaign_id
  LEFT JOIN (SELECT placement,placement_id FROM adh.cm_dt_placement) AS placement_mt
  ON clicks.event.placement_id = placement_mt.placement_id
  LEFT JOIN (SELECT site,site_id FROM adh.cm_dt_site) AS site_mt
  ON clicks.event.site_id = site_mt.site_id
  LEFT JOIN (SELECT browser_platform,browser_platform_id FROM adh.cm_dt_browser) AS browser_mt
  ON cast(clicks.event.browser_platform_id as string) = cast(browser_mt.browser_platform_id as string)
  LEFT JOIN (SELECT dma_region,dma_region_id FROM adh.cm_dt_designated_market_area) AS dma_mt
  ON clicks.event.dma_region_id = dma_mt.dma_region_id

  WHERE user_id != "0"
  __DYNAMIC_REPORTING_FILTERS_TAG__
  ),

impressions_and_clicks as (
select * from impressions_by_custom_grouping
union all
select * from clicks_by_custom_grouping
),

conversion_joined AS (
  SELECT
    a.User_ID,
    conversions,
    __DYNAMIC_REPORTING__SET_NAME_TAG__,
    COUNT(*) AS frequency
  FROM impressions_and_clicks a
  LEFT JOIN conversion_by_activity_ID b
  USING (User_ID ,__DYNAMIC_REPORTING__SET_NAME_TAG__)
  group by 1,2 ,__DYNAMIC_REPORTING__SET_NAME_TAG__
)

select
  CASE
      WHEN frequency <= 20 THEN CAST(frequency AS STRING)
      ELSE "21"
  END AS frequency_capped,
  __DYNAMIC_REPORTING__SET_NAME_TAG__,
  COUNT(distinct User_ID) AS unique_cookies,
  sum(frequency) AS impressions,
  sum(conversions) as conversions,
FROM conversion_joined
GROUP BY 1 ,__DYNAMIC_REPORTING__SET_NAME_TAG__
`;
