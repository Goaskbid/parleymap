# Data Model Summary

## Person

- `id`, `slug`, `canonicalName`
- `category`, `roleTitle`, `organization`, `orgType`
- `sector`, `industry`, `homeRegion`
- `prominenceScore`, `riskTier`
- `aliases`, `identifiers`, `officialUrl`
- `sourceReliability`, `reviewStatus`

## Appearance

- `id`, `personId`
- `startsAt`, `endsAt`, `status`
- `eventType`, `title`, `summary`, `significance`, `decisions`
- `location` with city, country, coordinates, precision
- `venuePublic`, `securityPrecision`
- `eventGroupId`, `topics`, `counterpartIds`
- `publicInterestScore`, `confidence`, `confidenceLabel`
- `sourcePack`, `visual`, `lastCheckedAt`, `needsHumanReview`

## Encounter

- `id`, `eventGroupId`, `title`, `date`
- `participantIds`, `appearanceIds`
- `location`, `summary`, `outcome`, `score`

## Source pack

- `label`, `url`, `type`, `license`, `checkedAt`, `reliability`

## Media asset

- `sourceUrl`, `author`, `license`, `licenseUrl`, `attributionText`, `checkedAt`, `reuseAllowed`, `modificationAllowed`
