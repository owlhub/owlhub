-- Rename the table
ALTER TABLE "security_finding" RENAME TO "app_type_secuirty_findings";

-- Update foreign key constraints
ALTER TABLE "integration_security_finding" 
DROP CONSTRAINT "integration_security_finding_securityFindingId_fkey",
ADD CONSTRAINT "integration_security_finding_securityFindingId_fkey" 
FOREIGN KEY ("securityFindingId") REFERENCES "app_type_secuirty_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integration_security_finding_details" 
DROP CONSTRAINT "integration_security_finding_details_securityFindingId_fkey",
ADD CONSTRAINT "integration_security_finding_details_securityFindingId_fkey" 
FOREIGN KEY ("securityFindingId") REFERENCES "app_type_secuirty_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;