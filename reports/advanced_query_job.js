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
 * Create and return a Job object for an advanced query job
 * AdvancedQueryJobs are basically dynamic jobs
 * @param {string} queryName Job Query Name
 * @param {string} querySQL Job SQL
 * @return {?Object} Job object
 */
function getAdvancedQueryJob(queryName, querySQL) {
  return {
    queryName: queryName,
    queryVersion: 1,
    reportParams: [
      {
        reportParamLoc: 0,
        queryParamName: 'activity_ids',
        valueType: VALUE_TYPE.ARRAY_OF_NUMBERS,
      },
      {
        reportParamLoc: 1,
        queryParamName: 'path_length',
        valueType: VALUE_TYPE.NUMBER,
      },
    ],
    mergeParams: [],
    queryTxt: querySQL,
  };
};
