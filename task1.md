Endpoint: GET https://api.airtable.com/v0/app5eoO1QYp4UAoaU/tbllK7OneV8hg4Qcv ✓
Auth: Bearer token in the Authorization header ✓
Store base URL + token in .env (and pull them into config/services.php) ✓
Call the endpoint, get back records (matching the shape of your sample JSON) ✓
Check the response for an offset value — if present, call the same endpoint again passing that offset as a query param, to get the next page ✓
Repeat until no offset comes back — that means you've pulled all records ✓

so we will add new button in the user page, pull pitch health user

that will pull data and save it to DB,

also make a scheduler for that

