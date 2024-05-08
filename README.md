# email-service
An Email service that sends an email every chosen months if a Site did not validate its data.


```
  email-service:
    image: lblod/data-validation-email-notifcation-service:latest
    environment:
      NUMBER_OF_MONTHS: "just a number of how many months"
      CRON_JOB : "* * * * *"
      URL: "URL of your environment"
    ports:
      - 1234:80
    links:
      - database:database
```