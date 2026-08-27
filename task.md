{{DomainURL}}/services/CustomerApi.svc/users/:userId/trainingprogress

this is the endpoint for getting the training progress of a user

userId = excel_id

so we will save this data in a pivot table

save this as meta_data because it will be a json file

in the response just get only the "TrainingPrograms" array

then save to metadata

inside the onboarding page, we will have a button that will take the user to the training progress page

the training progress page will have a cards component that will display the progress of the user

so the admin will be able to see the progress of the agents
