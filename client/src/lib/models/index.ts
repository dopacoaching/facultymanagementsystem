/**
 * Central import that ensures all Mongoose models are registered before
 * any populate() call runs. Import this once in db.ts.
 */
export { Campus }          from './Campus'
export { Batch }           from './Batch'
export { Faculty }         from './Faculty'
export { User }            from './User'
export { Session }         from './Session'
export { BatchChapter }    from './BatchChapter'
export { ISBatchChapter }  from './ISBatchChapter'
export { SalaryRecord }    from './SalaryRecord'
export { AuditLog }        from './AuditLog'
export { PermanentFacultyContract } from './PermanentFacultyContract'
export { CarryForwardBalance }      from './CarryForwardBalance'
export { RefreshToken }      from './RefreshToken'
export { SyllabusChapter }      from './SyllabusChapter'
export { PayableDays }          from './PayableDays'
export { NoClassDay }           from './NoClassDay'
