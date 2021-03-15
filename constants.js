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
 *  HTTP based response codes: Continue
 */
const ADH_JOB_RUNNING = 100;

/**
 *  HTTP based response codes: OK
 */
const ADH_JOB_SUCCESS = 200;

/**
 *  HTTP based response codes: Bad request
 */
const ADH_JOB_FAILURE = 400;

/**
*HTTP based response codes: Internal Server Error
*/
const SYSTEM_FAILURE = 500;

/**
 * Text format consts for generating report sheets
 */
const TEXT_FONT = "Arial";
const HEADER_BG_COLOR = "lightgray";
const FIELD_BG_COLOR = "whitesmoke";

/**
 * Sheet name that summarize query batch
 */
const PROCESSOR_SHEET_NAME = "Hubvantage Processor";

/**
 * How long to wait to acquire the mutex lock, in milliseconds
 */
const LOCK_ACQUIRE_TIMEOUT_MS = 100;

/**
 * Enum for supported parameter types. Used to initilize report parameters in
 * report config and later in constructing the the UI sheet
 * @enum {number}
 */
const PARAM_TYPE = {
  DROPDOWN: 1,
  FREE_TEXT: 2
};

/**
 * Enum for supported value types. Used to initilize report parameters in report
 * config and later in constructing the request
 * @enum {number}
 */
const VALUE_TYPE = {
  DATE: 1,
  NUMBER: 2,
  POSITIVE_NUMBER: 3,
  STRING: 4,
  ARRAY_OF_NUMBERS: 5,
  ARRAY_OF_STRINGS: 6
};

/**
 * Enum for supported reports. Represents existing report config files
 * @enum {string}
 */
const SUPPORTED_REPORTS = {
  RF_ANALYSIS:  "R&F Analysis",
  RF_ANALYSIS_V2: "R&F Analysis v2.0",
  BRAND_SURVEY_ANALYSIS: "Brand Survey Analysis",
  AUDIENCE_SPOTLIGHT: "Audience Spotlight / Explorer",
  BUSINESS_IMPACT_ANALYSIS: "Business Impact Analysis",
  CUSTOM_QUERY_ANALYSIS: "Custom Query Analysis",
  REACH_ANALYSIS: "Reach Analysis",
  FREQUENCY_ANALYSIS: "Optimal Frequency",
  OVERLAP_ANALYSIS: "Overlap Analysis",
  ATTRIBUTION_ANALYSIS: "Path Analysis",
};

//sheet developer meta data key to distinguish dynamic reports
const SHEET_LEVEL_REPORT_TYPE_KEY = "reportType";

//sheet developer meta data key for document trigger - used for auto refresh
const AUTO_REFRESH_TRIGGER_ID_KEY = "auto_refresh_status";

//sheet developer meta data key for job collection to refresh
const JOB_NAMES_METADATA_KEY = "job_names";

/**
* Dynamic reporting developer metadata tags - used to extract user input
* for query building
*/
const REPORT_PARAMS_META_TAG = 'Report_Param_Table';
const GROUPING_META_TAG = 'RnfAdvanced_Grouping_Table';
const OPTIONAL_FILTERS_META_TAG = 'RnfAdvanced_Optional_Filters_Table';
const GROUPING_SET_NAME_META_TAG = 'RnfAdvanced_Grouping_Set_Name';
/**
* Dynamic reporting tags - used in query templates to substitude with user input
*/
const DYNAMIC_REPORTING_GROUPING_TAG = '__DYNAMIC_REPORTING_GROUPING_TAG__';
const DYNAMIC_REPORTING_FILTER_TAG = '__DYNAMIC_REPORTING_FILTERS_TAG__';
const DYNAMIC_REPORTING_GROUPING_SET_NAME_TAG =
  '__DYNAMIC_REPORTING__SET_NAME_TAG__';
const IS_ADVANCED_REPORT_META_TAG = 'isAdvancedReport';

/**
 * Enum for field value types
 * @enum {number}
 */
const FIELD_TYPE = {
  NAN: 0,
  NAME: 1,
  ID: 2,
};

/**
 * Enum for query operations. Used to build logic table in reports UI
 * @enum {string}
 */
const SQL_OPERATORS = {
  CONTAIN: 'Contain',
  NOT_CONTAIN: 'Does not contain',
  EQUAL: 'Equals',
  NOT_EQUAL: 'Does not equal',
  IN: 'IN',
  NOT_IN: 'Not IN',
};

/**
 * Enum for supported dynamic queries. Serves for template mapping.
 * @enum {number}
 */
const DYNAMIC_QUERIES = {
  FREQUENCY_DISTRIBUTION_ACROSS_CHANNELS: 1,
  OPTIMAL_FREQUENCY: 2,
  OVERLAP_WITH_GOOGLE_MEDIA: 3,
  PATH_ANALYSIS: 4
};
