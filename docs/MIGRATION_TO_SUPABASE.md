# Migration to Supabase - M1 Plan

## Overview

Fitbear AI M0 uses Supabase for authentication and MongoDB for data storage. M1 will migrate to Supabase DB while maintaining Supabase Auth for a unified platform approach.

## Migration Strategy: Dual-Write Pattern

### Phase 1: Preparation (Pre-Migration)
1. **Repository Layer Complete** ✅
   - MongoDB repositories implemented and tested
   - Supabase repository stubs created with method signatures
   - Provider switching mechanism ready (`DB_PROVIDER` env var)

2. **Schema Preparation**
   - Execute schema from `/lib/supabase.sql` in Supabase SQL editor
   - Set up Row Level Security (RLS) policies
   - Create indexes matching MongoDB performance

### Phase 2: Dual-Write Implementation
1. **Update Repository Interface**
   - Implement Supabase repository methods
   - Add dual-write capability to repository layer
   - Write to both MongoDB and Supabase simultaneously

2. **Data Validation**
   - Compare write results between systems
   - Log discrepancies for investigation
   - Maintain MongoDB as source of truth during transition

### Phase 3: Data Backfill
1. **Historical Data Migration**
   ```bash
   # Export existing MongoDB data
   npm run db:export

   # Validate and transform data for Supabase
   npm run migrate:validate

   # Bulk import to Supabase
   npm run migrate:import
   ```

2. **Data Consistency Checks**
   - Verify record counts match between systems
   - Validate data integrity and relationships
   - Test query performance on Supabase

### Phase 4: Read Migration
1. **Gradual Read Switching**
   - Switch read operations to Supabase gradually
   - A/B test performance and accuracy
   - Maintain fallback to MongoDB for errors

2. **Performance Optimization**
   - Monitor Supabase query performance
   - Optimize indexes and RLS policies
   - Adjust connection pooling and caching

### Phase 5: Write Migration
1. **Switch to Supabase Primary**
   - Set `DB_PROVIDER=supabase` in environment
   - Stop writes to MongoDB
   - MongoDB becomes read-only backup

2. **Cleanup**
   - Remove dual-write logic after confidence period
   - Archive MongoDB data
   - Update documentation

## Row Level Security (RLS) Overview

### Core Principle
All data access must be filtered by authenticated user ID to ensure data isolation.

### RLS Policy Examples

```sql
-- Profiles table
CREATE POLICY "Users can only access own profile"
ON profiles FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Food logs table
CREATE POLICY "Users can only access own food logs"
ON food_logs FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Daily targets table
CREATE POLICY "Users can only access own targets"
ON daily_targets FOR ALL
TO authenticated
USING (user_id = auth.uid());
```

### RLS Testing Strategy
1. **Positive Tests**: Verify user can access own data
2. **Negative Tests**: Verify user cannot access other user's data
3. **Edge Cases**: Test with invalid/missing auth tokens

## Backfill Steps

### 1. Data Export
```bash
# Export all collections with user filtering
npm run migrate:export -- --collections profiles,targets,food_logs,ocr_scans,photo_analyses
```

### 2. Data Transformation
```bash
# Transform MongoDB documents to Supabase format
npm run migrate:transform -- --input exports/ --output transformed/
```

### 3. Supabase Import
```bash
# Import transformed data to Supabase
npm run migrate:import -- --source transformed/ --target supabase
```

### 4. Validation
```bash
# Validate data consistency between systems
npm run migrate:validate -- --source mongodb --target supabase
```

## Configuration Switch

### Environment Variables
```env
# Current M0 Configuration
DB_PROVIDER=mongo
MONGO_URL=mongodb://localhost:27017
DB_NAME=fitbear_production

# Future M1 Configuration  
DB_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Migration Command
```bash
# Single command to flip to Supabase after M1 preparation
export DB_PROVIDER=supabase && npm run migrate:switch
```

## Rollback Plan

### Emergency Rollback
1. **Immediate**: Set `DB_PROVIDER=mongo`
2. **Verify**: Test critical user flows (auth, profile, logging)
3. **Communicate**: Notify users of temporary service restoration
4. **Investigate**: Analyze Supabase issues for resolution

### Data Recovery
- MongoDB remains as backup during transition period
- Point-in-time recovery available via MongoDB snapshots
- Supabase backups provide additional safety net

## Performance Considerations

### MongoDB vs Supabase
| Metric | MongoDB | Supabase | Notes |
|--------|---------|----------|-------|
| Connection Overhead | Low | Medium | Supabase uses connection pooling |
| Query Performance | High | High | Both optimized for OLTP workloads |
| Scaling | Manual | Automatic | Supabase handles scaling automatically |
| Backup/Recovery | Manual | Automatic | Supabase provides automated backups |

### Optimization Strategies
1. **Indexes**: Mirror MongoDB indexes in Supabase
2. **Connection Pooling**: Use Supabase's built-in pooling
3. **Caching**: Implement application-level caching for hot data
4. **Batch Operations**: Use batch inserts for bulk operations

## Testing Strategy

### Pre-Migration Testing
- [ ] Repository layer unit tests pass for both providers
- [ ] Integration tests validate data consistency
- [ ] Performance benchmarks established

### Migration Testing
- [ ] Dual-write validation scripts
- [ ] Data consistency monitoring
- [ ] User acceptance testing on staging

### Post-Migration Testing
- [ ] End-to-end user flows
- [ ] Performance regression testing
- [ ] Security penetration testing

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Supabase Repository Implementation | 2-3 days | Schema setup complete |
| Dual-Write Integration | 1-2 days | Repository layer tested |
| Data Backfill | 1 day | Production data export |
| Read Migration & Testing | 2-3 days | Data consistency verified |
| Write Migration & Cleanup | 1 day | Performance validated |

**Total Estimate**: 7-10 days for complete migration

## Success Criteria

### Functional Requirements
- [ ] All user data successfully migrated
- [ ] Zero data loss during migration
- [ ] All API endpoints function correctly
- [ ] Performance meets or exceeds MongoDB baseline

### Non-Functional Requirements
- [ ] RLS policies prevent cross-user data access
- [ ] Backup and recovery procedures validated
- [ ] Monitoring and alerting in place
- [ ] Documentation updated for new architecture

## Contacts & Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Migration Scripts**: `/scripts/migration/`
- **Test Data**: `/tests/fixtures/migration/`
- **Monitoring**: PostHog events for migration tracking