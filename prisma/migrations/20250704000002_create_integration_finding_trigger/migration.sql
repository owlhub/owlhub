-- Function to update counts in integration_findings table
CREATE OR REPLACE FUNCTION update_integration_finding_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT operations
    IF (TG_OP = 'INSERT') THEN
        IF NEW.hidden = TRUE THEN
            -- Increment hiddenCount
            UPDATE integration_findings
            SET "hiddenCount" = "hiddenCount" + 1,
                "lastDetectedAt" = NOW()
            WHERE "integrationId" = NEW."integrationId" AND "appFindingId" = NEW."appFindingId";
        ELSE
            -- Increment activeCount
            UPDATE integration_findings
            SET "activeCount" = "activeCount" + 1,
                "lastDetectedAt" = NOW()
            WHERE "integrationId" = NEW."integrationId" AND "appFindingId" = NEW."appFindingId";
        END IF;

    -- For DELETE operations
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.hidden = TRUE THEN
            -- Decrement hiddenCount, ensuring it doesn't go below zero
            UPDATE integration_findings
            SET "hiddenCount" = GREATEST("hiddenCount" - 1, 0)
            WHERE "integrationId" = OLD."integrationId" AND "appFindingId" = OLD."appFindingId";
        ELSE
            -- Decrement activeCount, ensuring it doesn't go below zero
            UPDATE integration_findings
            SET "activeCount" = GREATEST("activeCount" - 1, 0)
            WHERE "integrationId" = OLD."integrationId" AND "appFindingId" = OLD."appFindingId";
        END IF;

    -- For UPDATE operations (when hidden status changes)
    ELSIF (TG_OP = 'UPDATE') AND (OLD.hidden IS DISTINCT FROM NEW.hidden) THEN
        IF NEW.hidden = TRUE THEN
            -- Changed from active to hidden
            UPDATE integration_findings
            SET "activeCount" = GREATEST("activeCount" - 1, 0),
                "hiddenCount" = "hiddenCount" + 1
            WHERE "integrationId" = NEW."integrationId" AND "appFindingId" = NEW."appFindingId";
        ELSE
            -- Changed from hidden to active
            UPDATE integration_findings
            SET "activeCount" = "activeCount" + 1,
                "hiddenCount" = GREATEST("hiddenCount" - 1, 0)
            WHERE "integrationId" = NEW."integrationId" AND "appFindingId" = NEW."appFindingId";
        END IF;

        -- Update lastDetectedAt only if NEW.lastDetectedAt is greater than the existing value
        -- This handles both cases: when hidden status changes and when it doesn't
        IF NEW."lastDetectedAt" IS NOT NULL THEN
            UPDATE integration_findings
            SET "lastDetectedAt" = NEW."lastDetectedAt"
            WHERE "integrationId" = NEW."integrationId"
              AND "appFindingId" = NEW."appFindingId"
              AND ("lastDetectedAt" IS NULL OR "lastDetectedAt" < NEW."lastDetectedAt");
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS integration_finding_detail_trigger ON integration_finding_details;

-- Create trigger on integration_finding_details table
CREATE TRIGGER integration_finding_detail_trigger
AFTER INSERT OR UPDATE OR DELETE ON integration_finding_details
FOR EACH ROW EXECUTE FUNCTION update_integration_finding_counts();
