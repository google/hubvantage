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
 * Returns Business Impact report object.
 * The first party BQ table name is mandatory for this report.
 * @return {!Object} Report Config Object
 */
function getBusinessImpactAnalysisReport() {
  const reportConfig = {
    name: SUPPORTED_REPORTS.BUSINESS_IMPACT_ANALYSIS,
    jobs: function (configVals) {
      var firstpartyBQTableName = configVals[3];
      return firstpartyBQTableName.trim() ? [getBusinessImpactAnalysisJob(firstpartyBQTableName)] : [];
    },
    reportParams: [
      {
        displayParamName: 'CM Advertiser IDs - Brand',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS,
      },
      {
        displayParamName: 'CM Campaign IDs - Brand',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS
      },
      {
        displayParamName: 'CM Site IDs - Brand',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS
      },
      {
        displayParamName: '1P Conversion Data BQ Table',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.STRING
      },
      {
        displayParamName: 'Conversion Start Date',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.DATE
      },
      {
        displayParamName: 'Conversion End Date',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.DATE
      },
      {
        displayParamName: 'Cutoff Date for Pre/Post Analysis',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.DATE
      },
      {
        displayParamName: 'Conversion Lookback Window (in days)',
        paramType: PARAM_TYPE.FREE_TEXT,
        valueType: VALUE_TYPE.POSITIVE_NUMBER
      }
    ]
  };
  return reportConfig;
}
