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
 * Optional Filter class represents SQL where clauses joined by AND operator.
 * This unit validates input (expressions) and parses it into SQL.
 */
class OptionalFilter {
  /**
   * Optional Filter
   * @constructor
   * @param  {?Array<!QueryExpression>} queryExpression
   */
  constructor(expressions = null) {
    this.errorMessages = [];
    /** @private @const {Array<QueryExpression>} **/
    this.expressions_ = [];
    if (expressions && expressions.length > 0) {
      //add valid expression to collection and set errors for invalid
      //expressions
      expressions.forEach(element => {
        if (element.isValid()) {
          this.expressions_.push(element);
        } else if (!element.isEmpty()) {
          this.errorMessages.push(element.errorMessages.join('\n'));
        }
      });
    }
  }

  /**
   * translates current optional filter to query syntax
   * @returns {?string} sql representation of expression appended with AND
   */
  getQuerySyntaxString() {
    if (!this.expressions_.length) return undefined;
    //get query SQL representation for valid expressions
    let expressionsSql = this.expressions_.filter(e => e.isValid())
        .map( e => e.getQuerySyntaxString());

    return `AND ${expressionsSql.join(' AND ')}`;
  }

  /**
   * Checks for expressions validity for optional filter
   * @returns {Boolean} if error exists expression is invalid
   */
  isValid() {
    //optional filters can be empty
    return (!this.errorMessages.length);
  }
}
