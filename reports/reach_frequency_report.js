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
 * Returns a Reach and Frequency report object.
 * The jobs function will return CM or DV360 jobs based on configVals values.
 * @return {!Object} Report Config Object
 */
function getRnFReport() {
  return {
    name: SUPPORTED_REPORTS.RF_ANALYSIS,
    jobs: function (configVals) {
      let dataSource = configVals[0];
      switch (dataSource) {
        case 'Campaign Manager':
          return [getCmRnFCityJob(), getCmRnFOverlapJob()];
        case 'DV360':
          return [getDV360RnFCityJob(), getDV360RnFOverlapJob()];
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
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS
      },
      {
        displayParamName: 'Campaign IDs',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS
      }
    ]
  };
}
