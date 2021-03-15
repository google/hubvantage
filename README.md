# Hubvantage

**Custom Google Sheets AddOn powered by Ads Data Hub**

#### OVERVIEW

Hubvantage **AIM**s to deliver a superior cross-channel marketer experience
(across YT, Display, Video, PG etc) with pre-packaged data insights solution
that provides: \

*   Self Service **A**nalytics
*   Unprecedented cross-product **I**nsights
*   Deterministic **M**easurement at scale

**Hubvantage** is **powered by Ads Data Hub**(ADH) -

*   ADH provides customers access to granular Google ads data in a privacy-safe
    environment, where one can write SQL queries to analyze their marketing
    campaigns
*   With **Hubvantage**, many of the advanced marketing analytics use cases are
    standardized and packaged into a ready-to-deploy solution, exposing a simple
    to use configuration sheet to customise these solutions.
*   **Hubvantage** simplifies the entire workflow by leveraging automation &
    delivers a self-service platform that marketers can use without having to
    deal with technical complexities of ADH.
*   By accelerating the use case building & query development (from 5-6 months
    to ~2 weeks), **Hubvantage** enables agencies & partners to leverage ADH at
    scale for their clients.

#### USE CASES

**Hubvantage** solves for Marketer’s top pain points with below ready-to-deploy
use cases:

Output for each use case can be visualized in the form of dashboard pages in
Data Studio.

1.  **Reach & Frequency Center**

    Provides R&F distribution by cities including insights into top cities
    having high freq. (3+ exposures) and low freq. (&lt;= 2 exposures). Report
    configuration takes input media source as either CM or DV360. Filter
    available to obtain data at campaign level and insertion order level (DV360)
    or site level (CM). Also provides reach overlap between any 2 campaigns or
    IOs.

2.  **Brandometer 360**

    Determines brand lift across different brand attributes, measured by running
    a custom survey ad (similar to Brandometer) and whose responses are
    segmented into control / expose based on user’s exposure to the campaign
    across all Google-tracked media channels (eg: YT, PG, display). The report
    also provides ability to filter responses by city & survey placements to
    reflect brand lift metrics accordingly. Survey ad is trafficked as an HTML5
    creative in CM with responses tracked in form of rich-media Studio events.

3.  **Audience Spotlight**

    Provides granular insights about audiences reached via campaigns, including
    details such as demographics, affinity & in-market audiences. Report
    configuration takes input media source as either CM or DV360. Dashboard view
    includes filters for campaign / insertion order, exposure level (i.e.
    frequency of 1 / 2 / 3+), age group, gender, floodlight conversion activity,
    1st party audience segment (if specified in report config). Reach metrics
    can be obtained using any combination of above filters. This report uses
    RDID tables and requires clients to have Google Ads accounts linked to DV360
    and ADH. It also provides a match rate for demo / affinity / in-market,
    which depends on data available in Google Ads tables over the same period.

4.  **Audience Explorer**

    Displays a scatter chart of affinity & in-market audiences with reach and
    conversion rate plotted on the two axes. The chart is divided into 4
    quadrants with specific audience activation strategy associated with each
    quadrant. This use case is built on the same report configuration params as
    Audience Spotlight, and supports the same set of filters on the dashboard.

5.  **Business Influence**

    Determines the impact of campaign impressions (i.e. level of exposure) on
    business metrics such as average order value / average order frequency. This
    requires bringing in 1P transaction data (or other conversion data) into
    BigQuery, keyed in with device ID. The schema for the 1P data is a fixed
    format (see implementation guide for details). The analysis is done for both
    pre / post periods based on the user's first time of exposure to the
    campaign.

#### ELIGIBILITY, REQUIREMENTS & APPLICATION PROCESS

**Eligibility**

Customers who buy media via Google and have an ADH & Google Cloud contract are
eligible. See the “Requirements” section for more details.

Since many use cases in Amplify are built using RDID tables of ADH, customers
who largely buy media on in-app inventory or have in-app conversions are a good
fit.

**Requirements**

**Product Requirements**

*   **ADH** - Must have an active Ads Data Hub account
*   **BigQuery** - Must have an active GCP account with BigQuery access
*   **Data Studio** - Required for visualization of output for all use cases
*   **DV360 & Campaign Manager** - Must be on GMP stack and actively buying
    media via DV360
*   **Google Ads** _(optional, but recommended)_ - Some use cases require this
    to build match tables. Note that Google Ads account must be linked to the
    DV360 account.

**Data Requirements**

*   **Campaign Data** - Should have at least 30 days of data in ADH tables for
    any meaningful insights
*   **1st Party Data(optional, but recommended)** - For use cases involving 1P
    data join, the data should be brought into BQ in the format specified in the
    implementation guide.
