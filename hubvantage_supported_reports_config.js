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
 * Returns the report config object from the report name.
 * @param  {string} reportDisplayName report name as defined in report config
 * @return {!Object} Report Configuration Object
 */
function getReportConfigObjFromDisplayString_(reportDisplayName) {
  switch (reportDisplayName) {
    case SUPPORTED_REPORTS.BRAND_SURVEY_ANALYSIS:
      return getBrandLiftAnalysisReport();
    case SUPPORTED_REPORTS.RF_ANALYSIS:
      return getRnFReport();
    case SUPPORTED_REPORTS.FREQUENCY_ANALYSIS:
      return getDefaultDynamicReport(
        SUPPORTED_REPORTS.FREQUENCY_ANALYSIS);
    case SUPPORTED_REPORTS.REACH_ANALYSIS:
      return getDefaultDynamicReport(
        SUPPORTED_REPORTS.REACH_ANALYSIS);
    case SUPPORTED_REPORTS.OVERLAP_ANALYSIS:
      return getDefaultDynamicReport(
        SUPPORTED_REPORTS.OVERLAP_ANALYSIS);
    case SUPPORTED_REPORTS.ATTRIBUTION_ANALYSIS:
      return getAttributionDynamicReport(
        SUPPORTED_REPORTS.ATTRIBUTION_ANALYSIS);
    case SUPPORTED_REPORTS.RF_ANALYSIS_V2:
      return getRnfReportV2();
    case SUPPORTED_REPORTS.AUDIENCE_SPOTLIGHT:
      return getAudienceSpotlightReport();
    case SUPPORTED_REPORTS.BUSINESS_IMPACT_ANALYSIS:
      return getBusinessImpactAnalysisReport();
    case SUPPORTED_REPORTS.CUSTOM_QUERY_ANALYSIS:
      return getSavedQueryReport();
    default:
      throw Error(`Unsupported Report Type: ${reportDisplayName}`);
  }
}
/**
 * Returns a mapping of report type and the setup function for report.
 * @return {!Array<!Array<!SUPPORTED_REPORTS,string>>}
 * @private
 */
function getSupportedReportTypes_() {
  return [
    [
      SUPPORTED_REPORTS.RF_ANALYSIS,
      'rnfAnalysisSetup_'
    ],
    [
      SUPPORTED_REPORTS.RF_ANALYSIS_V2,
      'rnfV2AnalysisSetup_'
    ],
    [
      SUPPORTED_REPORTS.BRAND_SURVEY_ANALYSIS,
      'brandLiftAnalysisReportSetup_'
    ],
    [
      SUPPORTED_REPORTS.AUDIENCE_SPOTLIGHT,
      'audienceSpotlightReportSetup_'
    ],
    [
      SUPPORTED_REPORTS.BUSINESS_IMPACT_ANALYSIS,
      'businessImpactAnalysisReportSetup_'
    ],
    [
      SUPPORTED_REPORTS.CUSTOM_QUERY_ANALYSIS,
      'customQuerySchedulingReportSetup_'
    ],
    [
      SUPPORTED_REPORTS.REACH_ANALYSIS,
      'reachAnalysisAdvancedSetup_'
    ],
    [
      SUPPORTED_REPORTS.FREQUENCY_ANALYSIS,
      'frequencyAnalysisAdvancedSetup_'
    ],
    [
      SUPPORTED_REPORTS.OVERLAP_ANALYSIS,
      'overlapAnalysisAdvancedSetup_'
    ],
    [
      SUPPORTED_REPORTS.ATTRIBUTION_ANALYSIS,
      'attributionAnalysisAdvancedSetup_'
    ],
  ];
}

/**
 * Maps supported report types (configuration based) to advanced queries.
 * (supported by query builder) For Dynamic Queries one report configuration
 * object can serve different query implementation
 * @param  {!SUPPORTED_REPORTS} reportType SUPPORTED_REPORTS enum
 * @return {!DYNAMIC_QUERIES}
 */
function getAdvancedQueriesByReportType(reportType) {
  switch (reportType) {
    case SUPPORTED_REPORTS.REACH_ANALYSIS:
      return DYNAMIC_QUERIES.FREQUENCY_DISTRIBUTION_ACROSS_CHANNELS;
    case SUPPORTED_REPORTS.FREQUENCY_ANALYSIS:
      return DYNAMIC_QUERIES.OPTIMAL_FREQUENCY;
    case SUPPORTED_REPORTS.OVERLAP_ANALYSIS:
      return DYNAMIC_QUERIES.OVERLAP_WITH_GOOGLE_MEDIA;
    case SUPPORTED_REPORTS.ATTRIBUTION_ANALYSIS:
      return DYNAMIC_QUERIES.PATH_ANALYSIS;
  }
}

/**
 * Renders report input sheet and marks report type on sheet level.
 * @param  {!SUPPORTED_REPORTS} reportType
 * @param  {!isAdvancedReport=} isAdvancedReport Signifies that this is an
 *     advanced report (which includes extra sections); it will get special
 *     parsing at run time
 * @private
 */
function setupReportSheet_(reportType, isAdvancedReport = false) {
  let hvService = new HubVantageService();
  let reportConfigObject = getReportConfigObjFromDisplayString_(reportType);
  hvService.setupReportConfigSheet(reportConfigObject, reportType,
    isAdvancedReport);
}

/**
 *  Menu item event function to render reach and frequency analysis.
 */
function rnfAnalysisSetup_() {
  setupReportSheet_(SUPPORTED_REPORTS.RF_ANALYSIS);
}


/**
 *  Menu item event function to render reach and frequency analysis V2
 */
function rnfV2AnalysisSetup_() {
  setupReportSheet_(SUPPORTED_REPORTS.RF_ANALYSIS_V2);
}

/**
 *  Menu item event function to render reach analysis
 */
function reachAnalysisAdvancedSetup_() {
  setupReportSheet_(SUPPORTED_REPORTS.REACH_ANALYSIS, true);
}

/**
 *  Menu item event function to render frequency analysis
 */
function frequencyAnalysisAdvancedSetup_() {
  setupReportSheet_(SUPPORTED_REPORTS.FREQUENCY_ANALYSIS, true);
}

/**
 *  Menu item event function to render overlap analysis
 */
function overlapAnalysisAdvancedSetup_() {
  setupReportSheet_(SUPPORTED_REPORTS.OVERLAP_ANALYSIS, true);
}

/**
 *  Menu item event function to render attribution analysis
 */
function attributionAnalysisAdvancedSetup_() {
  setupReportSheet_(SUPPORTED_REPORTS.ATTRIBUTION_ANALYSIS, true);
}
/**
 *  Menu item event function to render brand survey analysis
 */
function brandLiftAnalysisReportSetup_() {
  setupReportSheet_(SUPPORTED_REPORTS.BRAND_SURVEY_ANALYSIS);
}

/**
 *  Menu item event function to render audience spotlight report
 */
function audienceSpotlightReportSetup_() {
  setupReportSheet_(SUPPORTED_REPORTS.AUDIENCE_SPOTLIGHT);
}

/**
 *  Menu item event function to render business impact analysis
 */
function businessImpactAnalysisReportSetup_() {
  setupReportSheet_(SUPPORTED_REPORTS.BUSINESS_IMPACT_ANALYSIS);
}

/**
 *  Menu item event function to render custom query analysis
 */
function customQuerySchedulingReportSetup_() {
  setupReportSheet_(SUPPORTED_REPORTS.CUSTOM_QUERY_ANALYSIS);
}
