DROP TRIGGER member_seats;
CREATE TRIGGER member_seats BEFORE INSERT ON members WHEN NEW.active=1 AND NOT EXISTS(SELECT 1 FROM members WHERE tenantId=NEW.tenantId AND userId=NEW.userId) BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM members WHERE tenantId=NEW.tenantId AND active=1)>=(SELECT CASE plan WHEN 'BUSINESS' THEN 5 ELSE 1 END FROM tenants WHERE id=NEW.tenantId) THEN RAISE(ABORT,'SEAT_LIMIT') END;
END;
DROP TRIGGER job_quota;
CREATE TRIGGER job_quota BEFORE INSERT ON jobs WHEN NOT EXISTS(SELECT 1 FROM jobs WHERE tenantId=NEW.tenantId AND requestKey=NEW.requestKey) BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM jobs WHERE tenantId=NEW.tenantId AND createdAt>=(SELECT periodStart FROM tenants WHERE id=NEW.tenantId))>=(SELECT CASE plan WHEN 'BUSINESS' THEN 1000 ELSE 200 END FROM tenants WHERE id=NEW.tenantId) THEN RAISE(ABORT,'QUOTA_JOBS') END;
END;
DROP TRIGGER inquiry_quota;
CREATE TRIGGER inquiry_quota BEFORE INSERT ON inquiries WHEN NOT EXISTS(SELECT 1 FROM inquiries WHERE tenantId=NEW.tenantId AND requestKey=NEW.requestKey) BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM inquiries WHERE tenantId=NEW.tenantId AND createdAt>=(SELECT periodStart FROM tenants WHERE id=NEW.tenantId))>=(SELECT CASE plan WHEN 'BUSINESS' THEN 1500 ELSE 300 END FROM tenants WHERE id=NEW.tenantId) THEN RAISE(ABORT,'QUOTA_INQUIRIES') END;
END;
