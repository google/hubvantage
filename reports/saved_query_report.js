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
 * Get Saved Query report
 * Saved Query reports are manually entered into a sheet, including SQL and
 * parameters
 * @return {!Object} Report Config Object
 */
function getSavedQueryReport() {
  return {
    name: 'Custom Query Analysis',
    jobs: function (configVals) {
      let queryTxt = configVals[2].trim();
      let paramStr = configVals[0].trim();
      let mergeParamsStr = configVals[1].trim();
      let paramLines = (paramStr != null && paramStr != '')
          ? paramStr.split('\n').filter(Boolean) : [];
      let mergeParamLines = (mergeParamsStr != null && mergeParamsStr != '')
          ? mergeParamsStr.split('\n').filter(Boolean) : [];
      return [{
        queryName: 'CUSTOM_QUERY_JOB',
        queryVersion: 1,
        reportParams: null,
        queryTxt: queryTxt,
        queryParams: paramLines,
        mergeParams: mergeParamLines
      }];
    },
    reportParams: [
      {
        displayParamName: 'Parameter Configuration',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.STRING,
      },
      {
        displayParamName: 'Filtered Row Summary Configuration',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.STRING,
      },
      {
        displayParamName: 'Query Text',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.STRING,
      },
    ],
  };
}
