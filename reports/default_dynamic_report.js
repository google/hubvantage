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
 * Initializes the configuration object for Reach, Frequency and overlap dynamic
 * reports.
 * Includes:
 * Report parameters: parameters to be collected from user and send to a
 * parameterized query. the default field used in all reports listed about are
 * activity Ids (array on integers with default value of 0) and path length
 * (number with default value of 0).
 * Grouping parameters: fields user can group by results in this report
 * Optional filters parameters: additional filter spaces user can query by.
 *
 * Both Grouping and Optional Filters parameters include the following:
 * maxUserEntries: number of user input rows in the table, representing the
 * number of max groupings the user can define.
 * groupingFilterTypes: a mapping of user display, adh field name, and value
 * type for validation expected input
 *
 * @param {string} reportName Report name to be used for in constructing job
 *         name in ADH
 * @return {!Object} report configuration object defining all drop down menus
 *         and ADH field mapping
 */
let getDefaultDynamicReport = function(reportName) {
  const reportConfig = {
    name: reportName,
    jobs: function(reportSheet) {
      return [getAdvancedQueryJob(reportName, reportSheet)];
    },
    reportParams: [
      {
        displayParamName: 'Activity IDs (applies to Optimal analysis)',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS,
        defaultValue: '0,0',
      },
      {
        displayParamName: 'Path length (applies to Attr. analysis)',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.NUMBER,
        defaultValue: 0,
      },
    ],
    groupingParams: {
      maxUserEntries: 5,
      groupingFilterTypes: [
        {
          displayParamName: 'Placement',
          adhFieldRepresentation: 'placement',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'Placement ID',
          adhFieldRepresentation: 'placement_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'Campaign',
          adhFieldRepresentation: 'campaign',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'Campaign ID',
          adhFieldRepresentation: 'campaign_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'Browser Platform',
          adhFieldRepresentation: 'browser_platform',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'Browser Platform ID',
          adhFieldRepresentation: 'browser_platform_id',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'dma_region',
          adhFieldRepresentation: 'dma_region',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'dma_region_id',
          adhFieldRepresentation: 'dma_region_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'Advertiser ID',
          adhFieldRepresentation: 'advertiser_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'Advertiser Name',
          adhFieldRepresentation: 'advertiser',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'Site ID',
          adhFieldRepresentation: 'site_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'Site',
          adhFieldRepresentation: 'site',
          valueType: FIELD_TYPE.NAME,
        },
      ],
      conditionTypes: [
        SQL_OPERATORS.CONTAIN,
        SQL_OPERATORS.NOT_CONTAIN,
        SQL_OPERATORS.EQUAL,
        SQL_OPERATORS.NOT_EQUAL,
        SQL_OPERATORS.IN,
        SQL_OPERATORS.NOT_IN,
      ],
    },
    optionalFiltersParams: {
      maxUserEntries: 5,
      groupingFilterTypes: [
        {
          displayParamName: 'Advertiser ID',
          adhFieldRepresentation: 'advertiser_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'Advertiser Name',
          adhFieldRepresentation: 'advertiser',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'Placement',
          adhFieldRepresentation: 'placement',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'Placement ID',
          adhFieldRepresentation: 'placement_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'Campaign',
          adhFieldRepresentation: 'campaign',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'Campaign ID',
          adhFieldRepresentation: 'campaign_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'Site ID',
          adhFieldRepresentation: 'site_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'Site',
          adhFieldRepresentation: 'site',
          valueType: FIELD_TYPE.NAME,
        },
      ],
      conditionTypes: [
        SQL_OPERATORS.CONTAIN,
        SQL_OPERATORS.NOT_CONTAIN,
        SQL_OPERATORS.EQUAL,
        SQL_OPERATORS.NOT_EQUAL,
        SQL_OPERATORS.IN,
        SQL_OPERATORS.NOT_IN,
      ],
    }
  };
  return reportConfig;
};
