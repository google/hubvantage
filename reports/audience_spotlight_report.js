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
 * Get Audience Spotlight / Explorer report
 * The jobs function will return CM or DV360 jobs based on configVals
 * @return {!Object} Report Config Object
 */
function getAudienceSpotlightReport() {
  return {
    name: 'Audience Spotlight / Explorer',
    jobs: function(configVals) {
      let dataSource = configVals[0];
      let firstPartyDataTable = configVals[5];

      switch(dataSource) {
        case 'Campaign Manager':
          return [getCmAudSpotJob(firstPartyDataTable)];
        case 'DV360':
          return [getDv360AudSpotJob(firstPartyDataTable)];
        default:
          return [];
      }
    },
    reportParams: [
      {
        displayParamName: 'Data Source',
        paramType: PARAM_TYPE.DROPDOWN,
        values: ['Campaign Manager', 'DV360'],
        valueType: VALUE_TYPE.ARRAY_OF_STRINGS,
      },
      {
        displayParamName: 'Advertiser IDs',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS,
      },
      {
        displayParamName: 'Campaign IDs',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS,
      },
      {
        displayParamName: 'CM Floodlight Activity ID (enter 1 value only)',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS,
      },
      {
        displayParamName: 'Conversion Lookback Window (in days)',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.POSITIVE_NUMBER,
      },
      {
        displayParamName: '1P Audience Segment BQ Table (optional)',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.STRING,
      },
      {
        displayParamName: 'Minimum audience RT for segment (optional)',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.POSITIVE_NUMBER,
        default: 1000,
      },
    ],
  };
}
