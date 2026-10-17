PRAGMA foreign_keys=ON;
CREATE TABLE "user"(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,emailVerified INTEGER NOT NULL DEFAULT 0,image TEXT,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL);
CREATE TABLE session(id TEXT PRIMARY KEY,expiresAt INTEGER NOT NULL,token TEXT NOT NULL UNIQUE,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL,ipAddress TEXT,userAgent TEXT,userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE);
CREATE INDEX session_user ON session(userId);
CREATE TABLE account(id TEXT PRIMARY KEY,accountId TEXT NOT NULL,providerId TEXT NOT NULL,userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,accessToken TEXT,refreshToken TEXT,idToken TEXT,accessTokenExpiresAt INTEGER,refreshTokenExpiresAt INTEGER,scope TEXT,password TEXT,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL,UNIQUE(providerId,accountId));
CREATE TABLE verification(id TEXT PRIMARY KEY,identifier TEXT NOT NULL,value TEXT NOT NULL,expiresAt INTEGER NOT NULL,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL);
CREATE INDEX verification_identifier ON verification(identifier);
CREATE TABLE rateLimit(id TEXT PRIMARY KEY,key TEXT NOT NULL UNIQUE,count INTEGER NOT NULL,lastRequest INTEGER NOT NULL);
CREATE TABLE tenants(
 id TEXT PRIMARY KEY,ownerId TEXT NOT NULL REFERENCES "user"(id),name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,
 plan TEXT NOT NULL DEFAULT 'STARTER' CHECK(plan IN ('STARTER','BUSINESS')),state TEXT NOT NULL DEFAULT 'pending',
 template TEXT NOT NULL,email TEXT NOT NULL,phone TEXT NOT NULL,address TEXT NOT NULL DEFAULT '',taxNumber TEXT NOT NULL DEFAULT '',
 minimumAmount INTEGER NOT NULL DEFAULT 0 CHECK(minimumAmount>=0),workflowJson TEXT NOT NULL,
 periodStart INTEGER NOT NULL,periodEnd INTEGER,trialEnd INTEGER,pastDueAt INTEGER,
 monthlyCredits INTEGER NOT NULL DEFAULT 0 CHECK(monthlyCredits>=0),purchasedCredits INTEGER NOT NULL DEFAULT 0 CHECK(purchasedCredits>=0),
 stripeCustomerId TEXT UNIQUE,stripeSubscriptionId TEXT UNIQUE,cancelAtPeriodEnd INTEGER NOT NULL DEFAULT 0,
 pendingPlan TEXT CHECK(pendingPlan IN ('STARTER','BUSINESS')),autoAiResponse INTEGER NOT NULL DEFAULT 0,
 googleReviewUrl TEXT NOT NULL DEFAULT '',facebookReviewUrl TEXT NOT NULL DEFAULT '',
 invoiceProvider TEXT NOT NULL DEFAULT 'MANUAL',invoiceKey TEXT,invoiceBlockId TEXT NOT NULL DEFAULT '',invoiceTaxMode TEXT NOT NULL DEFAULT '',invoiceAutoIssue INTEGER NOT NULL DEFAULT 0,
 allowedOrigins TEXT NOT NULL DEFAULT '[]',createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL);
CREATE TABLE members(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,userId TEXT NOT NULL REFERENCES "user"(id),role TEXT NOT NULL CHECK(role IN ('OWNER','ADMIN','DISPATCHER','DRIVER','WORKER')),active INTEGER NOT NULL DEFAULT 1,createdAt INTEGER NOT NULL,UNIQUE(tenantId,userId),UNIQUE(tenantId,id));
CREATE INDEX member_user ON members(userId,active);
CREATE TABLE invitations(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,email TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('ADMIN','DISPATCHER','DRIVER','WORKER')),tokenHash TEXT NOT NULL UNIQUE,state TEXT NOT NULL DEFAULT 'pending',expiresAt INTEGER NOT NULL,createdAt INTEGER NOT NULL);
CREATE UNIQUE INDEX invitation_pending ON invitations(tenantId,email) WHERE state='pending';
CREATE TRIGGER member_seats BEFORE INSERT ON members WHEN NEW.active=1 BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM members WHERE tenantId=NEW.tenantId AND active=1)>=(SELECT CASE plan WHEN 'BUSINESS' THEN 5 ELSE 1 END FROM tenants WHERE id=NEW.tenantId) THEN RAISE(ABORT,'SEAT_LIMIT') END; END;
CREATE TRIGGER member_reactivate BEFORE UPDATE OF active ON members WHEN NEW.active=1 AND OLD.active=0 BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM members WHERE tenantId=NEW.tenantId AND active=1)>=(SELECT CASE plan WHEN 'BUSINESS' THEN 5 ELSE 1 END FROM tenants WHERE id=NEW.tenantId) THEN RAISE(ABORT,'SEAT_LIMIT') END; END;
CREATE TRIGGER invitation_seats BEFORE INSERT ON invitations BEGIN
 SELECT CASE WHEN ((SELECT count(*) FROM members WHERE tenantId=NEW.tenantId AND active=1)+(SELECT count(*) FROM invitations WHERE tenantId=NEW.tenantId AND state='pending' AND expiresAt>unixepoch()*1000))>=(SELECT CASE plan WHEN 'BUSINESS' THEN 5 ELSE 1 END FROM tenants WHERE id=NEW.tenantId) THEN RAISE(ABORT,'SEAT_LIMIT') END; END;
CREATE TABLE customers(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,name TEXT NOT NULL,email TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL,address TEXT NOT NULL DEFAULT '',taxNumber TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL,UNIQUE(tenantId,id));
CREATE INDEX customer_search ON customers(tenantId,name);
CREATE TABLE priceRules(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,name TEXT NOT NULL,unit TEXT NOT NULL CHECK(unit IN ('M2','PIECE','HOUR','FIXED')),unitPrice INTEGER NOT NULL CHECK(unitPrice>=0),isExtra INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,createdAt INTEGER NOT NULL,UNIQUE(tenantId,id));
CREATE TABLE jobs(
 id TEXT PRIMARY KEY,tenantId TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,customerId TEXT NOT NULL,jobCode TEXT NOT NULL,workflowJson TEXT NOT NULL,stageId TEXT NOT NULL,archived INTEGER NOT NULL DEFAULT 0,
 assignedMemberId TEXT,scheduledDate TEXT,deliveryDate TEXT,routeOrder INTEGER NOT NULL DEFAULT 0,quickCount INTEGER NOT NULL DEFAULT 0 CHECK(quickCount>=0),
 totalAmount INTEGER NOT NULL DEFAULT 0 CHECK(totalAmount>=0),minimumAmount INTEGER NOT NULL DEFAULT 0,paymentMethod TEXT NOT NULL DEFAULT 'CASH' CHECK(paymentMethod IN ('CASH','CARD_POS','TRANSFER')),paymentStatus TEXT NOT NULL DEFAULT 'PENDING' CHECK(paymentStatus IN ('PENDING','PAID')),
 customerNotes TEXT NOT NULL DEFAULT '',internalNotes TEXT NOT NULL DEFAULT '',publicMessage TEXT NOT NULL DEFAULT '',trackingHash TEXT UNIQUE,trackingCipher TEXT,version INTEGER NOT NULL DEFAULT 1,requestKey TEXT NOT NULL,
 createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL,UNIQUE(tenantId,id),UNIQUE(tenantId,jobCode),UNIQUE(tenantId,requestKey),
 FOREIGN KEY(tenantId,customerId) REFERENCES customers(tenantId,id),FOREIGN KEY(tenantId,assignedMemberId) REFERENCES members(tenantId,id));
CREATE INDEX jobs_tenant_stage ON jobs(tenantId,archived,stageId,createdAt);
CREATE INDEX jobs_driver_date ON jobs(tenantId,assignedMemberId,scheduledDate,deliveryDate);
CREATE TRIGGER job_quota BEFORE INSERT ON jobs BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM jobs WHERE tenantId=NEW.tenantId AND createdAt>=(SELECT periodStart FROM tenants WHERE id=NEW.tenantId))>=(SELECT CASE plan WHEN 'BUSINESS' THEN 1000 ELSE 200 END FROM tenants WHERE id=NEW.tenantId) THEN RAISE(ABORT,'QUOTA_JOBS') END; END;
CREATE TABLE jobItems(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL,jobId TEXT NOT NULL,name TEXT NOT NULL,unit TEXT NOT NULL,quantity REAL NOT NULL,width REAL,length REAL,unitPrice INTEGER NOT NULL,total INTEGER NOT NULL,createdAt INTEGER NOT NULL,UNIQUE(tenantId,id),FOREIGN KEY(tenantId,jobId) REFERENCES jobs(tenantId,id) ON DELETE CASCADE);
CREATE TABLE itemExtras(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL,itemId TEXT NOT NULL,name TEXT NOT NULL,amount INTEGER NOT NULL,FOREIGN KEY(tenantId,itemId) REFERENCES jobItems(tenantId,id) ON DELETE CASCADE);
CREATE TABLE jobEvents(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL,jobId TEXT NOT NULL,memberId TEXT,stageId TEXT,kind TEXT NOT NULL,message TEXT NOT NULL DEFAULT '',isPublic INTEGER NOT NULL DEFAULT 0,createdAt INTEGER NOT NULL,FOREIGN KEY(tenantId,jobId) REFERENCES jobs(tenantId,id) ON DELETE CASCADE,FOREIGN KEY(tenantId,memberId) REFERENCES members(tenantId,id));
CREATE TABLE inquiries(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,name TEXT NOT NULL,email TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL,address TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',source TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'NEW',estimatedAmount INTEGER,aiSummary TEXT,aiDraft TEXT,jobId TEXT,requestKey TEXT NOT NULL,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL,UNIQUE(tenantId,id),UNIQUE(tenantId,requestKey),FOREIGN KEY(tenantId,jobId) REFERENCES jobs(tenantId,id));
CREATE INDEX inquiries_tenant_state ON inquiries(tenantId,state,createdAt);
CREATE TRIGGER inquiry_quota BEFORE INSERT ON inquiries BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM inquiries WHERE tenantId=NEW.tenantId AND createdAt>=(SELECT periodStart FROM tenants WHERE id=NEW.tenantId))>=(SELECT CASE plan WHEN 'BUSINESS' THEN 1500 ELSE 300 END FROM tenants WHERE id=NEW.tenantId) THEN RAISE(ABORT,'QUOTA_INQUIRIES') END; END;
CREATE TABLE files(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL,jobId TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('PHOTO','SIGNATURE','RECEIPT','LABEL','INVOICE')),objectKey TEXT NOT NULL UNIQUE,filename TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,isPublic INTEGER NOT NULL DEFAULT 0,createdAt INTEGER NOT NULL,UNIQUE(tenantId,id),FOREIGN KEY(tenantId,jobId) REFERENCES jobs(tenantId,id) ON DELETE CASCADE);
CREATE TABLE handovers(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL,jobId TEXT NOT NULL,memberId TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('PICKUP','DELIVERY')),signatureFileId TEXT NOT NULL,snapshotJson TEXT NOT NULL,createdAt INTEGER NOT NULL,FOREIGN KEY(tenantId,jobId) REFERENCES jobs(tenantId,id),FOREIGN KEY(tenantId,memberId) REFERENCES members(tenantId,id),FOREIGN KEY(tenantId,signatureFileId) REFERENCES files(tenantId,id),UNIQUE(tenantId,jobId,kind));
CREATE TABLE apiKeys(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,name TEXT NOT NULL,tokenHash TEXT NOT NULL UNIQUE,prefix TEXT NOT NULL,revokedAt INTEGER,createdAt INTEGER NOT NULL);
CREATE TABLE tasks(id TEXT PRIMARY KEY,tenantId TEXT REFERENCES tenants(id) ON DELETE CASCADE,type TEXT NOT NULL,payload TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,availableAt INTEGER NOT NULL,leaseUntil INTEGER,leaseToken TEXT,dedupeKey TEXT NOT NULL UNIQUE,lastError TEXT,result TEXT,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL);
CREATE INDEX task_outbox ON tasks(state,availableAt,leaseUntil);
CREATE TABLE creditLedger(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,taskId TEXT REFERENCES tasks(id),monthlyDelta INTEGER NOT NULL DEFAULT 0,purchasedDelta INTEGER NOT NULL DEFAULT 0,description TEXT NOT NULL,requestKey TEXT NOT NULL UNIQUE,createdAt INTEGER NOT NULL);
CREATE TABLE webhookEvents(id TEXT PRIMARY KEY,type TEXT NOT NULL,receivedAt INTEGER NOT NULL,processedAt INTEGER);
CREATE TABLE trialClaims(userId TEXT PRIMARY KEY REFERENCES "user"(id),tenantId TEXT NOT NULL UNIQUE REFERENCES tenants(id),claimedAt INTEGER NOT NULL);
CREATE TABLE invoiceRecords(id TEXT PRIMARY KEY,tenantId TEXT REFERENCES tenants(id),jobId TEXT,sourceId TEXT NOT NULL UNIQUE,provider TEXT NOT NULL,state TEXT NOT NULL,externalId TEXT,number TEXT,fileId TEXT,requestKey TEXT NOT NULL UNIQUE,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL,FOREIGN KEY(tenantId,jobId) REFERENCES jobs(tenantId,id),FOREIGN KEY(tenantId,fileId) REFERENCES files(tenantId,id));
CREATE TABLE emailDeliveries(id TEXT PRIMARY KEY,taskId TEXT NOT NULL REFERENCES tasks(id),tenantId TEXT REFERENCES tenants(id),state TEXT NOT NULL,updatedAt INTEGER NOT NULL);
CREATE TABLE throttle(key TEXT NOT NULL,window INTEGER NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(key,window));
CREATE TABLE auditLog(id TEXT PRIMARY KEY,tenantId TEXT NOT NULL REFERENCES tenants(id),userId TEXT NOT NULL REFERENCES "user"(id),action TEXT NOT NULL,targetId TEXT,createdAt INTEGER NOT NULL);
