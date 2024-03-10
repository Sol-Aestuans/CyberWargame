# Cyber Wargame

## Notes for setting up
- In `backend`, make a `.env` file using `.env.example`.
- In `frontend`, make a `.env.local` file using `.env.local.example`.
- In `game-logic`, make a `.env` file using `.env.example`.
- Generate an API key with full permissions in Strapi and set `STRAPI_API_KEY` in `.env.local`.
- Run `npm run strapi import -- -f testdata.tar.gz` to import test data.
  - If you are not importing data, you must set user permissions by going to Settings -> Users & Permissions plugin -> Roles -> Authenticated -> Team -> check find and findOne
- Teams and roles must be assigned to users in the Strapi content manager.

## Figma Design Link 
https://www.figma.com/file/XcUKMbDtdU089AALdSTlDZ/SP-Landing?type=design&mode=design&t=vDXiULTKo9GHUpCH-1
