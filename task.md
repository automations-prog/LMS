{{DomainURL}}/services/CustomerApi.svc/locations/:locationId/trainingprogress?PageIndex=0&PageSize=50&includeChildren=false

we will use .env for saving this values DomainURL,apiKey,locationId

check also the pagination here,

sample response, @test.json

so in the admin user page we will add a new button, Pulled New Agents so this will call this api and save the user
xcel_id = id,email, then the password will be a default "password"
the other data in response will be save to meta data
