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
 * Gets correct query SQL for Reach and Frequency jobs based on the type of
 * output, data source and platform type.
 * @param {string} rnfReportType Type of reach and frequency report (standard/overlap).
 * @param {string} product The product which determines the data source from
 * where the campaign data would be picked (CM/DV360/GA).
 * @param {string} platform The platform for which campaign data would be
 * picked up (web/ app / both).
 * @return {string} Valid SQL text for the combination of input parameters.
 */
function buildReachAndFrequencySQL(rnfReportType, product, platform) {
  const stepOneCM = `/** Step 1: Get impressions from CM campaigns specified */
  WITH
  impressions_by_campaigns AS
  (
  SELECT
      __COLUMN_USER_ID__ AS user_id,
      imp.event.event_time,
      CAST(imp.event.campaign_id AS STRING) AS campaign_id,
      COALESCE(cm_campaign_mt.campaign, 'Unknown') AS campaign_name,
      CAST(imp.event.site_id AS STRING) AS breakdown_id,
      COALESCE(cm_site_mt.site, 'Unknown') AS breakdown_name,
      'CM' AS campaign_source,
      c.city AS city_name
  FROM adh.cm_dt_impressions__RDID_SUFFIX__ imp
      LEFT JOIN adh.cm_dt_campaign cm_campaign_mt
      ON imp.event.campaign_id = cm_campaign_mt.campaign_id
      LEFT JOIN adh.cm_dt_site cm_site_mt
      ON imp.event.site_id = cm_site_mt.site_id
      LEFT JOIN adh.cm_dt_city c
      ON imp.event.city_id = c.city_id
  WHERE __COLUMN_USER_ID__ != "0"
      __FILTERAPP_WHERE_DDM__
      AND imp.event.advertiser_id IN UNNEST(@advertiserIds)
      AND imp.event.campaign_id IN UNNEST(@campaignIds)
  )`;

  const stepOneDV360 = `/** Step 1: Get impressions from DV360 campaigns specified */
  WITH
  trueview_impressions_from_dv360 AS
  (
  SELECT
      __COLUMN_USER_ID__ AS user_id,
      ti.query_id.time_usec AS event_time,
      ti.location.geo_city_id AS city_id,
      ti.insertion_order_id AS dv360_insertion_order_id,
      ti.campaign_id AS dv360_campaign_id
  FROM adh.dv360_youtube_impressions__RDID_SUFFIX__ ti
  WHERE __COLUMN_USER_ID__ != '0'
      __FILTERAPP_WHERE_GAYT__
      AND ti.campaign_id IN UNNEST(@campaignIds)
      AND ti.advertiser_id IN UNNEST(@advertiserIds)
  ),

  non_trueview_impressions_from_dv360 AS
  (
  SELECT
  __COLUMN_USER_ID__ AS user_id,
      nti.event.event_time AS event_time,
      nti.event.dv360_city_id AS city_id,
      nti.event.dv360_insertion_order_id,
      nti.event.dv360_campaign_id
  FROM adh.dv360_dt_impressions__RDID_SUFFIX__ nti
  WHERE __COLUMN_USER_ID__ != '0'
      __FILTERAPP_WHERE_DDM__
      AND nti.event.dv360_campaign_id IN UNNEST(@campaignIds)
      AND nti.event.dv360_advertiser_id IN UNNEST(@advertiserIds)
  ),

  impressions_by_campaigns AS
  (
  SELECT
      imp.user_id,
      imp.event_time,
      CAST(imp.dv360_campaign_id AS STRING) AS campaign_id,
      COALESCE(dv3_cmp_mt.dv360_campaign, 'Unknown') AS campaign_name,
      CAST(imp.dv360_insertion_order_id AS STRING) AS breakdown_id,
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
  )`;

  const stepOneGA = `/** Step 1: Get impressions from Google Ads campaigns specified */
  WITH
  impressions_by_campaigns AS
  (
  SELECT
      __COLUMN_USER_ID__ AS user_id,
      imp.query_id.time_usec,
      CAST(imp.campaign_id AS STRING) AS campaign_id,
      COALESCE(gads_campaign_mt.campaign_name, 'Unknown') AS campaign_name,
      CAST(imp.adgroup_id AS STRING) AS breakdown_id,
      COALESCE(gads_adgroup_mt.adgroup_name, 'Unknown') AS breakdown_name,
      'Google Ads' AS campaign_source,
      c.city_name AS city_name
  FROM adh.google_ads_impressions__RDID_SUFFIX__ imp
      LEFT JOIN adh.google_ads_campaign gads_campaign_mt
      ON imp.campaign_id = gads_campaign_mt.campaign_id
      LEFT JOIN adh.google_ads_adgroup gads_adgroup_mt
      ON imp.adgroup_id = gads_adgroup_mt.adgroup_id
      LEFT JOIN adh.city c
      ON imp.location.geo_city_id = c.city_id
  WHERE __COLUMN_USER_ID__ != "0"
      __FILTERAPP_WHERE_GAYT__
      AND imp.customer_id IN UNNEST(@advertiserIds)
      AND imp.campaign_id IN UNNEST(@campaignIds)
  )`;

  const stepTwo = `,
  /** Step 2: Group to user level and calculate impressions per user at campaign & breakdown level */
  imp_count_by_user_campaign_level AS
  (
  SELECT
      user_id,
      campaign_source,
      campaign_id,
      campaign_name,
      '-All-' AS breakdown_id,
      '-All-' AS breakdown_name,
      city_name,
      COUNT(user_id) AS impressions
  FROM
      impressions_by_campaigns
  GROUP BY 1, 2, 3, 4, 5, 6, 7
  ),

  imp_count_by_user_breakdown_level AS
  (
  SELECT
      user_id,
      campaign_source,
      campaign_id,
      campaign_name,
      breakdown_id,
      breakdown_name,
      city_name,
      COUNT(user_id) AS impressions
  FROM
      impressions_by_campaigns
  GROUP BY 1, 2, 3, 4, 5, 6, 7
  ),

  imp_count_by_user_all AS
  (
      SELECT * FROM imp_count_by_user_campaign_level
      UNION ALL
      SELECT * FROM imp_count_by_user_breakdown_level
  )`;

  const stepThreeNormal = `/** Step 3: Reach by Exposure Level i.e. Frequency */
  SELECT
      campaign_source,
      campaign_id,
      campaign_name,
      breakdown_id,
      breakdown_name,
      city_name,
      CASE
      WHEN impressions < 6 THEN CAST(impressions AS STRING)
      ELSE '6+'
      END AS exposure_level,
      COUNT(user_id) AS unique_reach
  FROM imp_count_by_user_all
  GROUP BY 1, 2, 3, 4, 5, 6, 7;`;

  const stepThreeOverlap = `/** Step 3: Do self-join to get overlaps between any 2 campaigns. NOTE: Overlap of A:A is total reach and not exclusive reach */
  SELECT
      c1.campaign_source,
      c1.campaign_id AS campaign1,
      c1.campaign_name AS campaign1_name,
      c1.breakdown_id AS breakdown1,
      c1.breakdown_name AS breakdown1_name,
      c2.campaign_id AS campaign2,
      c2.campaign_name AS campaign2_name,
      c2.breakdown_id AS breakdown2,
      c2.breakdown_name AS breakdown2_name,
      COUNT(DISTINCT c1.user_id) AS reach_overlap
  FROM
      imp_count_by_user_all c1
      JOIN imp_count_by_user_all c2
      ON c1.user_id = c2.user_id
  GROUP BY
      1, 2, 3, 4, 5, 6, 7, 8, 9;`;

  function convertSQL(sql, userIdColumn, rdidTable, filterApp) {
    let suffix = rdidTable ? '_rdid' : '';
    let ddmWhereValue = filterApp ? 'AND is_in_rdid_project = false' : '';
    let gaytWhereValue = filterApp ? 'AND is_app_traffic = false' : '';

    return sql.replace(/__COLUMN_USER_ID__/g, userIdColumn)
      .replace(/__RDID_SUFFIX__/g, suffix)
      .replace(/__FILTERAPP_WHERE_DDM__/g, ddmWhereValue)
      .replace(/__FILTERAPP_WHERE_GAYT__/g, gaytWhereValue);
  }
  let stepThree;
  switch (rnfReportType) {
    case 'standard':
      stepThree = stepThreeNormal;
      break;
    case 'overlap':
      stepThree = stepThreeOverlap;
      break;
    default:
      throw new Error(`typ must be standard or overlap not ${rnfReportType}`);
  }

  let stepOne;
  switch (product) {
    case 'CM':
      stepOne = stepOneCM;
      break;
    case 'DV360':
      stepOne = stepOneDV360;
      break;
    case 'GA':
      stepOne = stepOneGA;
      break;
    default:
      throw new Error(`product must be CM, DV360, or GA`);
  }

  let sql = `${stepOne}\n\n${stepTwo}\n\n${stepThree}`;

  switch (platform) {
    case 'app':
      return convertSQL(sql, 'device_id_md5', true, false);
    case 'web':
      return convertSQL(sql, 'user_id', false, true);
    case 'all':
      return convertSQL(sql, 'user_id', false, false);
    default:
      throw new Error('platform must be app, web, or all');
  }
}

/**
 * Returns Reach and Frequency Analysis Job Object.
 * @return {!Object} JobConfig Object
 */
function getAppCmRnfJob() {
  return {
    queryName: 'APP_CM_RNF',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign_name'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'breakdown_name'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('standard', 'CM', 'app')
  };
}

/**
 * Returns Reach and Frequency Analysis Job Object with data source as CM and
 * platform as web.
 * @return {!Object} JobConfig Object
 */
function getWebCmRnfJob() {
  return {
    queryName: 'WEB_CM_RNF',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign_name'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'breakdown_name'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('standard', 'CM', 'web')
  };
}

/**
 * Returns Reach and Frequency Analysis Job Object with data source as CM and
 * platform as web and app.
 * @return {!Object} JobConfig Object
 */
function getAllCmRnfJob() {
  return {
    queryName: 'BOTH_CM_RNF',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign_name'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'breakdown_name'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('standard', 'CM', 'all')
  };
}

/**
 * Returns Reach and Frequency Analysis Job Object with data source as DV360 and
 * platform as app.
 * @return {!Object} JobConfig Object
 */
function getAppDV360RnfJob() {
  return {
    queryName: 'APP_DV360_RNF',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign_name'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'breakdown_name'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('standard', 'DV360', 'app')
  };
}

/**
 * Returns Reach and Frequency Analysis Job Object with data source as DV360 and
 * platform as web.
 * @return {!Object} JobConfig Object
 */
function getWebDV360RnfJob() {
  return {
    queryName: 'WEB_DV360_RNF',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign_name'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'breakdown_name'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('standard', 'DV360', 'web')
  };
}

/**
 * Returns Reach and Frequency Analysis Job Object with data source as DV360 and
 * platform as web and app.
 * @return {!Object} JobConfig Object
 */
function getAllDV360RnfJob() {
  return {
    queryName: 'ALL_DV360_RNF',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign_name'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'breakdown_name'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('standard', 'DV360', 'all')
  };
}

/**
 * Returns Reach and Frequency Analysis Job Object with data source as GA and
 * platform as app.
 * @return {!Object} JobConfig Object
 */
function getAppGaRnfJob() {
  return {
    queryName: 'APP_GA_RNF',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign_name'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'breakdown_name'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('standard', 'GA', 'app')
  };
}

/**
 * Returns Reach and Frequency Analysis Job Object with data source as GA and
 * platform as web.
 * @return {!Object} JobConfig Object
 */
function getWebGaRnfJob() {
  return {
    queryName: 'WEB_GA_RNF',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign_name'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'breakdown_name'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('standard', 'GA', 'web')
  };
}

/**
 * Returns Reach and Frequency Analysis Job Object with data source as GA and
 * platform as web and app.
 * @return {!Object} JobConfig Object
 */
function getAllGaRnfJob() {
  return {
    queryName: 'ALL_GA_RNF',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign_name'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'breakdown_name'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('standard', 'GA', 'all')
  };
}

/**
 * Returns Reach Overlap Job Object with data source as CM and platform as app.
 * @return {!Object} JobConfig Object
 */
function getAppCmRnfOverlapJob() {
  return {
    queryName: 'APP_CM_RNF_OVERLAP',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign2'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign1'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('overlap', 'CM', 'app')
  };
}

/**
 * Returns Reach Overlap Job Object with data source as CM and platform as web.
 * @return {!Object} JobConfig Object
 */
function getWebCmRnfOverlapJob() {
  return {
    queryName: 'WEB_CM_RNF_OVERLAP',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign2'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign1'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('overlap', 'CM', 'web')
  };
}

/**
 * Returns Reach Overlap Job Object with data source as CM and platform as app
 * and web.
 * @return {!Object} JobConfig Object
 */
function getAllCmRnfOverlapJob() {
  return {
    queryName: 'BOTH_CM_RNF_OVERLAP',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign2'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign1'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('overlap', 'CM', 'all')
  };
}

/**
 * Returns Reach Overlap Job Object with data source as DV360 and platform as
 * app.
 * @return {!Object} JobConfig Object
 */
function getAppDV360RnfOverlapJob() {
  return {
    queryName: 'APP_DV360_RNF_OVERLAP',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign2'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign1'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('overlap', 'DV360', 'app')
  };
}

/**
 * Returns Reach Overlap Job Object with data source as DV360 and platform as
 * web.
 * @return {!Object} JobConfig Object
 */
function getWebDV360RnfOverlapJob() {
  return {
    queryName: 'WEB_DV360_RNF_OVERLAP',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign2'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign1'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('overlap', 'DV360', 'web')
  };
}

/**
 * Returns Reach Overlap Job Object with data source as DV360 and platform as
 * app and web.
 * @return {!Object} JobConfig Object
 */
function getAllDV360RnfOverlapJob() {
  return {
    queryName: 'ALL_DV360_RNF_OVERLAP',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign2'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign1'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('overlap', 'DV360', 'all')
  };
}

/**
 * Returns Reach Overlap Job Object with data source as GA and platform as app.
 * @return {!Object} JobConfig Object
 */
function getAppGaRnfOverlapJob() {
  return {
    queryName: 'APP_GA_RNF_OVERLAP',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign2'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign1'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('overlap', 'GA', 'app')
  };
}

/**
 * Returns Reach Overlap Job Object with data source as GA and platform as web.
 * @return {!Object} JobConfig Object
 */
function getWebGaRnfOverlapJob() {
  return {
    queryName: 'WEB_GA_RNF_OVERLAP',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign2'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign1'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('overlap', 'GA', 'web')
  };
}

/**
 * Returns Reach Overlap Job Object with data source as GA and platform as app
 * and web.
 * @return {!Object} JobConfig Object
 */
function getAllGARnfOverlapJob() {
  return {
    queryName: 'ALL_GA_RNF_OVERLAP',
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 2,
        queryParamName: 'advertiserIds'
      },
      {
        reportParamLoc: 3,
        queryParamName: 'campaignIds'
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
        queryParamName: 'campaign2'
      },
      {
        type: 'CONSTANT',
        value: 'UNKNOWN',
        queryParamName: 'campaign1'
      }
    ],
    queryTxt: buildReachAndFrequencySQL('overlap', 'GA', 'all')
  };
}
