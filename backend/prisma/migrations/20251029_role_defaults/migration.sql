-- Adjust default roles to safer values
-- User.role: default 'user' (was 'owner')
-- UserOrg.role: default 'member' (was 'owner')

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';
ALTER TABLE "UserOrg" ALTER COLUMN "role" SET DEFAULT 'member';

-- Note: existing rows keep their current values. This only changes defaults.

