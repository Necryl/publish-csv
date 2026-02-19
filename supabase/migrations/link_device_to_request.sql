-- Link approved recovery request to device for exact tracking
alter table link_devices add column if not exists approved_request_id uuid references recovery_requests(id) on delete set null;

create index if not exists link_devices_approved_request_id on link_devices (approved_request_id);
