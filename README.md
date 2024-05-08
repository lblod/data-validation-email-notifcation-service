# email-service
An Email service that sends an email every chosen months if a Site did not validate its data.

The environemts are optional, the default variables are :
```
  email-service:
    image: lblod/data-validation-email-notifcation-service:latest
    environment:
      NUMBER_OF_MONTHS: "6"
      CRON_JOB : "0 0 */2 * *"
      URL: "URL of your environment"
    ports:
      - 1234:80
    links:
      - database:database
```