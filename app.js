import { app, uuid } from "mu";
import { querySudo as query } from "@lblod/mu-auth-sudo";
import { CronJob } from "cron";

function getDateSixMonthsAgo() {
 const now = new Date();
 const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
 return sixMonthsAgo.toISOString();
}

async function sendEmail(email, id) {
 console.log(`Sending email to: ${email} with UUID: ${id}`);
 await query(`           
 PREFIX nmo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#>
 PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
 PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
 INSERT DATA {
     GRAPH <http://mu.semte.ch/graphs/system/email> {
       <http://data.lblod.info/id/emails/${uuid()}> a nmo:Email;
               nmo:messageFrom "noreply@vlaanderen.be";
               nmo:emailTo "${email}";
               nmo:messageSubject "Gegevens bijwerken";
               nmo:plainTextMessageContent """

                Je ontvangt deze e-mail als gebruiker van de module Contactgegevens in Loket voor Lokale Besturen. 

                De contactgegevens van deze vestiging van jouw lokaal bestuur zijn 6 maanden geleden voor het laastst aangepast of gecontroleerd. 
                
                https://contactgegevens.lokaalbestuur.vlaanderen.be/vestigingen/${id}.

                Wij verzoeken je de gegevens te bekijken en indien nodig aan te passen. 
                Het is belangrijk dat je deze gegevens controleert en bijwerkt, aangezien ze worden gebruikt in andere toepassingen van de Vlaamse overheid. 
                Heb je nog vragen? Aarzel dan niet om ons per e-mail te contacteren op LoketLokaalBestuur@vlaanderen.be.        
               """;
               nmo:isPartOf <http://data.lblod.info/id/mail-folders/2>.
     }
 }`);
}

let emailSent = false; 

const job = new CronJob("0 0 */2 * *", async function () {
 console.log("Running a task every two weeks");
 try {
    if (emailSent) {
      console.log("Email already sent. Stopping the job.");
      this.stop(); 
      return;
    }

    const dateString = getDateSixMonthsAgo();
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

    emailSent = true;
    console.error(error);
 }
});

job.start();