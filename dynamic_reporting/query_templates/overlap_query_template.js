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
const OVERLAP_WITH_GOOGLE_MEDIA_QUERY_TEMPLATE = `
with audiences_by_impression AS (
  SELECT
    user_id,
    site_mt.site,

    CASE WHEN lower(site_mt.site) like '%dbm%'
    or lower(site_mt.site) like '%dv3%'
    or lower(site_mt.site) like'%doubleclick%'
    or lower(site_mt.site) like'%google%'
    or lower(site_mt.site) like'%display & video 360%'
    or lower(site_mt.site) like'%dc bid mgr%'
    or lower(site_mt.site) like'gdn'
    or lower(site_mt.site) like'youtube'
    or lower(site_mt.site) like'bidmanager_dfasite'
    or lower(site_mt.site) like'%invite media%'
    THEN 1 ELSE 0
    END AS Google_Audience_Bucket,

    CASE WHEN lower(site_mt.site) not like '%dbm%'
    or lower(site_mt.site) not like '%dv3%'
    or lower(site_mt.site) not like'%doubleclick%'
    or lower(site_mt.site) not like'%google%'
    or lower(site_mt.site) not like'%display & video 360%'
    or lower(site_mt.site) not like'%dc bid mgr%'
    or lower(site_mt.site) not like'gdn'
    or lower(site_mt.site) not like'youtube'
    or lower(site_mt.site) not like'bidmanager_dfasite'
    or lower(site_mt.site) not like'%invite media%'
    THEN 1 ELSE 0
    END AS Partner_Audience_Bucket

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

imp_by_user AS
(
SELECT
  user_id,
  SUM(Google_Audience_Bucket) AS Google_media_Imp,
  SUM(Partner_Audience_Bucket) AS Partner_media_Imp
FROM audiences_by_impression
GROUP BY 1
),

audience_exposure_by_user AS
(
SELECT
  user_id,
  CASE
    WHEN Google_media_Imp>=1 AND Partner_media_Imp>=1 THEN 'Overlap_users'
    ELSE 'Non_Overlap_users'
  END AS Audience_Exposure
FROM imp_by_user
),

exposure_joined as (
select a.*, b.Audience_Exposure as Audience_Exposure
from audiences_by_impression a
left join audience_exposure_by_user b
using(user_id)
),

Overlap_reach_by_site as (
select site, count (distinct user_id) as overlap_reach_with_google_media
from exposure_joined
where Audience_Exposure = 'Overlap_users' and Google_Audience_Bucket = 0
group by 1
),

Overall_reach_by_site as (
select site, count (distinct user_id) as overall_reach
from audiences_by_impression
group by 1
)

select a.site,
a.overall_reach,
b.overlap_reach_with_google_media
from Overall_reach_by_site a
left join Overlap_reach_by_site b
using (site)
group by 1,2,3
`;
