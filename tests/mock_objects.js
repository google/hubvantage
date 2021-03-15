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
 * Mock grouping parameters object to use in unit tests
 */
const groupingParamsMock = {
  maxUserEntries: 5,
  groupingFilterTypes: [
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
      displayParamName: 'Paid Search Campaign',
      adhFieldRepresentation: 'paid_search_campaign',
      valueType: FIELD_TYPE.NAME
    },
    {
      displayParamName: 'Paid Search Campaign ID',
      adhFieldRepresentation: 'paid_search_campaign_id',
      valueType: FIELD_TYPE.ID
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

/**
 * Mock optional filters parameters object to use in unit tests
 */
const optionalFiltersParamsMock = {
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
