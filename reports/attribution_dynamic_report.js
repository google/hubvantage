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
 * Get the Report Object for Reach & Frequency Advanced Reports
 * Includes:
 * Report parameters (data source / report types/ mandatory user input)
 * Grouping parameters: fields user can group by results in this report
 * Optional filters parameters: additional filter spaces user can query by.
 * @param {string} reportName Report Name
 * @return {!Object} ReportConfig Object
 */
function getAttributionDynamicReport(reportName) {
  return {
    name: reportName,
    jobs: function(reportSheet) {
      return [getAdvancedQueryJob(reportName, reportSheet)];
    },
    reportParams: [
      {
        displayParamName: 'Activity IDs',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS,
        defaultValue: '0,0',
      },
      {
        displayParamName: 'Path length',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.NUMBER,
        defaultValue: 0,
      },
    ],
    groupingParams: {
      maxUserEntries: 5,
      groupingFilterTypes: [
        {
          displayParamName: 'Advertiser',
          adhFieldRepresentation: 'advertiser',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'Advertiser ID',
          adhFieldRepresentation:'advertiser_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName:'Placement',
          adhFieldRepresentation:'placement',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName:'Placement_ID',
          adhFieldRepresentation:'placement_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'Site',
          adhFieldRepresentation:'site',
          valueType:FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'Site ID',
          adhFieldRepresentation:'site_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'Campaign',
          adhFieldRepresentation:'campaign',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'Campaign ID',
          adhFieldRepresentation:'campaign_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'Browser Platform ID',
          adhFieldRepresentation:'browser_platform_id',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'Browser Platform',
          adhFieldRepresentation:'browser_platform',
          valueType: FIELD_TYPE.NAME,
        },
        {
          displayParamName: 'DMA region id',
          adhFieldRepresentation:'dma_region_id',
          valueType: FIELD_TYPE.ID,
        },
        {
          displayParamName: 'DMA region',
          adhFieldRepresentation:'dma_region',
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
              valueType: FIELD_TYPE.ID
          },
          {
              displayParamName: 'Advertiser Name',
              adhFieldRepresentation: 'advertiser',
              valueType: FIELD_TYPE.NAME
          },
          {
              displayParamName: 'Placement',
              adhFieldRepresentation: 'placement',
              valueType: FIELD_TYPE.NAME
          },
          {
              displayParamName: 'Placement ID',
              adhFieldRepresentation: 'placement_id',
              valueType: FIELD_TYPE.ID
          },
          {
              displayParamName: 'Campaign',
              adhFieldRepresentation: 'campaign',
              valueType: FIELD_TYPE.NAME
          },
          {
              displayParamName: 'Campaign ID',
              adhFieldRepresentation: 'campaign_id',
              valueType: FIELD_TYPE.ID
          },
          {
              displayParamName: 'Site ID',
              adhFieldRepresentation: 'site_id',
              valueType: FIELD_TYPE.ID
          },
          {
              displayParamName: 'Site',
              adhFieldRepresentation: 'site',
              valueType: FIELD_TYPE.NAME
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
  };
};
