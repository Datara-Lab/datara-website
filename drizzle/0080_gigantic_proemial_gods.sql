CREATE UNIQUE INDEX "employee_profiles_tenant_employee_number_unique" ON "employee_profiles" USING btree ("tenant_id","employee_number");
