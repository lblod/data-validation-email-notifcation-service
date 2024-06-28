import { uuid } from "mu";
import { querySudo as query } from "@lblod/mu-auth-sudo";
import { CronJob } from "cron";

const DEFAULT_NUMBER_OF_MONTHS = parseInt(process.env.NUMBER_OF_MONTHS) || 6;

if (DEFAULT_NUMBER_OF_MONTHS === 6) {
  console.warn('WARNING: NUMBER_OF_MONTHS is not set. Using default value.');
}
const NumberOfMonths = DEFAULT_NUMBER_OF_MONTHS;

function getDateMonthsAgo(monthsAgo) {
  const now = new Date();
  const targetDate = new Date(now.setMonth(now.getMonth() - monthsAgo));
  return targetDate.toISOString();
}

async function sendEmail(email, id) {
  const emailUri = `http://data.lblod.info/id/emails/${uuid()}`;
  console.log(`Sending email to: ${email} with UUID: ${id}`);
  await query(`           
 PREFIX nmo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#>
 PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
 PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
 INSERT DATA {
     GRAPH <http://mu.semte.ch/graphs/system/email> {
       <${emailUri}> a nmo:Email;
               nmo:messageFrom "noreply@vlaanderen.be";
               nmo:emailTo "${email}";
               nmo:messageSubject "Contact- en organisatiegegevens corrigeren/bevestigen";
               nmo:plainTextMessageContent """

               Je ontvangt deze e-mail als gebruiker van de module Contact- en Organisatiegegevens in Loket voor Lokale Besturen. 
                
                De contactgegevens van deze vestiging van jouw organisatie zijn ${NumberOfMonths} maanden geleden voor het laatst aangepast of bevestigd.

                ${process.env.URL}/vestigingen/${id}.

                Het is belangrijk dat je foute gegevens bijwerkt of juiste gegevens bevestigt, 
                aangezien deze worden gebruikt in andere toepassingen van de Vlaamse overheid. 

                Heb je nog vragen? Aarzel dan niet om ons per e-mail te contacteren op LoketLokaalBestuur@vlaanderen.be.
               """;
               nmo:isPartOf <http://data.lblod.info/id/mail-folders/2>.
     }
 }`);
}

let lastEmailSentAt = null;

const job = new CronJob(
  process.env.CRON_JOB || "0 0 */2 * *",
  async function () {
    console.log("Running a task every");
    console.log("Number Of Months", NumberOfMonths);
    console.log("Cron Job", process.env.CRON_JOB);

    try {
      const dateString = getDateMonthsAgo(6);
      const results = await query(`
        PREFIX org: <http://www.w3.org/ns/org#>
        PREFIX schema: <http://schema.org/>
        PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
        PREFIX dct: <http://purl.org/dc/terms/>
        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>

        SELECT DISTINCT ?uuid ?email
        WHERE {
            ?administrativeUnit a besluit:Bestuurseenheid ;
                                mu:uuid ?uuid ;
                                org:hasPrimarySite ?primarySite . 
            ?primarySite a org:Site ;
                 dct:modified ?modifiedPrimarySite ;
                 org:siteAddress ?contactPoint .
            ?contactPoint a schema:ContactPoint ;
                   schema:email ?email .
            OPTIONAL {
             ?administrativeUnit org:hasSite ?site .
             ?site dct:modified ?modified .
            }
            FILTER((?modifiedPrimarySite < "${dateString}"^^xsd:dateTime ) || (?modified < "${dateString}"^^xsd:dateTime))
        }
      `);
        for (const binding of results.results.bindings) {
          const email = binding.email.value;
          const uuid = binding.uuid.value;
          await sendEmail(email, uuid);
        }
    } catch (error) {
      console.error(error);
    }
  },
);

job.start();
