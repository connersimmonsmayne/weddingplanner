'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Upload, Download, AlertCircle, CheckCircle2, AlertTriangle, X } from 'lucide-react'

// Expected CSV columns
const EXPECTED_COLUMNS = ['Name', 'Relationship', 'Priority', 'Plus One', 'Address', 'Notes']
const VALID_PRIORITIES = ['Must', 'Like', 'Maybe']
const MAX_ROWS = 500

interface ParsedGuest {
  rowNumber: number
  name: string
  relationship: string
  priority: string
  plusOne: string
  address: string
  notes: string
  status: 'valid' | 'warning' | 'error'
  warnings: string[]
}

interface CSVUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weddingId: string
  existingGuests: { name: string }[]
  onSuccess: () => void
}

type Step = 'upload' | 'preview' | 'importing'

export function CSVUploadDialog({
  open,
  onOpenChange,
  weddingId,
  existingGuests,
  onSuccess,
}: CSVUploadDialogProps) {
  const [step, setStep] = useState<Step>('upload')
  const [error, setError] = useState<string | null>(null)
  const [parsedGuests, setParsedGuests] = useState<ParsedGuest[]>([])
  const [duplicates, setDuplicates] = useState<string[]>([])
  const [importDuplicates, setImportDuplicates] = useState(false)
  const [skippedRows, setSkippedRows] = useState(0)
  const [unknownColumns, setUnknownColumns] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setStep('upload')
    setError(null)
    setParsedGuests([])
    setDuplicates([])
    setImportDuplicates(false)
    setSkippedRows(0)
    setUnknownColumns([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState()
    }
    onOpenChange(newOpen)
  }

  const downloadTemplate = () => {
    const template = `Name,Relationship,Priority,Plus One,Address,Notes
John Smith,Friend,Must,Jane Smith,"123 Main St, City, ST 12345",Vegetarian
Jane Smith,Friend's Partner,Must,,"123 Main St, City, ST 12345",`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'guest-list-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseCSV = (text: string): { headers: string[], rows: string[][] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (lines.length === 0) return { headers: [], rows: [] }

    // Parse CSV properly handling quoted fields
    const parseLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const headers = parseLine(lines[0])
    const rows = lines.slice(1).map(parseLine)

    return { headers, rows }
  }

  const handleFileSelect = async (file: File) => {
    setError(null)

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file (.csv)')
      return
    }

    // Read file
    const text = await file.text()
    if (!text.trim()) {
      setError('The CSV file is empty')
      return
    }

    const { headers, rows } = parseCSV(text)

    // Check for Name column (case-insensitive)
    const headerMap: Record<string, number> = {}
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim())
    
    EXPECTED_COLUMNS.forEach(col => {
      const index = normalizedHeaders.indexOf(col.toLowerCase())
      if (index !== -1) {
        headerMap[col] = index
      }
    })

    if (headerMap['Name'] === undefined) {
      const nameIndex = normalizedHeaders.findIndex(h => 
        h === 'name' || h === 'guest' || h === 'guest name' || h === 'full name'
      )
      if (nameIndex !== -1) {
        headerMap['Name'] = nameIndex
      } else {
        setError(`Missing required column: Name. Your file has columns: ${headers.join(', ')}. Expected: ${EXPECTED_COLUMNS.join(', ')}`)
        return
      }
    }

    // Check for unknown columns
    const knownLower = EXPECTED_COLUMNS.map(c => c.toLowerCase())
    const unknown = headers.filter(h => !knownLower.includes(h.toLowerCase().trim()))
    setUnknownColumns(unknown)

    // Check row count
    if (rows.length > MAX_ROWS) {
      setError(`Maximum ${MAX_ROWS} guests per import. Your file has ${rows.length} rows.`)
      return
    }

    // Parse rows
    const guests: ParsedGuest[] = []
    let skipped = 0
    const existingNames = new Set(existingGuests.map(g => g.name.toLowerCase().trim()))
    const foundDuplicates: string[] = []

    rows.forEach((row, index) => {
      const name = row[headerMap['Name']]?.trim() || ''
      
      if (!name) {
        skipped++
        return
      }

      const relationship = headerMap['Relationship'] !== undefined ? row[headerMap['Relationship']]?.trim() || '' : ''
      const priority = headerMap['Priority'] !== undefined ? row[headerMap['Priority']]?.trim() || '' : ''
      const plusOne = headerMap['Plus One'] !== undefined ? row[headerMap['Plus One']]?.trim() || '' : ''
      const address = headerMap['Address'] !== undefined ? row[headerMap['Address']]?.trim() || '' : ''
      const notes = headerMap['Notes'] !== undefined ? row[headerMap['Notes']]?.trim() || '' : ''

      const warnings: string[] = []
      let status: 'valid' | 'warning' = 'valid'

      // Validate priority
      if (priority && !VALID_PRIORITIES.includes(priority)) {
        warnings.push(`Invalid priority "${priority}", will default to "Must"`)
        status = 'warning'
      }

      // Check for duplicates
      if (existingNames.has(name.toLowerCase())) {
        foundDuplicates.push(name)
      }

      guests.push({
        rowNumber: index + 2, // +2 for 1-indexed and header row
        name,
        relationship,
        priority: VALID_PRIORITIES.includes(priority) ? priority : 'Must',
        plusOne,
        address,
        notes,
        status,
        warnings,
      })
    })

    setSkippedRows(skipped)
    setParsedGuests(guests)
    setDuplicates(foundDuplicates)
    setStep('preview')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handleImport = async () => {
    setStep('importing')

    // Filter out duplicates if user chose not to import them
    const guestsToImport = importDuplicates 
      ? parsedGuests 
      : parsedGuests.filter(g => !duplicates.includes(g.name))

    if (guestsToImport.length === 0) {
      toast.error('No guests to import')
      setStep('preview')
      return
    }

    // Create import group name with current date
    const today = new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    })
    const groupName = `Imported - ${today}`

    // Prepare guest data for insert
    const guestData = guestsToImport.map(g => ({
      wedding_id: weddingId,
      name: g.name,
      group_name: groupName,
      relationship: g.relationship || null,
      priority: g.priority || 'Must',
      plus_one: g.plusOne || null,
      address: g.address || null,
      notes: g.notes || null,
      rsvp_status: 'pending' as const,
    }))

    try {
      // Import using the Supabase client
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Insert in batches of 100
      for (let i = 0; i < guestData.length; i += 100) {
        const batch = guestData.slice(i, i + 100)
        const { error } = await supabase.from('guests').insert(batch)
        
        if (error) {
          throw error
        }
      }

      toast.success(`Successfully imported ${guestsToImport.length} guests`)
      onSuccess()
      handleOpenChange(false)
    } catch (err) {
      console.error('Import error:', err)
      toast.error('Failed to import guests. Please try again.')
      setStep('preview')
    }
  }

  const guestsToImportCount = importDuplicates 
    ? parsedGuests.length 
    : parsedGuests.length - duplicates.length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Guests from CSV</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file with your guest list'}
            {step === 'preview' && 'Review the guests before importing'}
            {step === 'importing' && 'Importing guests...'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            {/* Download template */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Download className="h-4 w-4" />
              <button 
                onClick={downloadTemplate}
                className="text-primary hover:underline"
              >
                Download CSV template
              </button>
              <span>with example data</span>
            </div>

            {/* Dropzone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Drop your CSV file here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Expected format */}
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Expected columns:</p>
              <p>{EXPECTED_COLUMNS.join(', ')}</p>
              <p className="mt-1">Only "Name" is required. Maximum {MAX_ROWS} guests per import.</p>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Warnings */}
            {unknownColumns.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded-md text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>Unknown columns will be ignored: {unknownColumns.join(', ')}</p>
              </div>
            )}

            {skippedRows > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded-md text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{skippedRows} row(s) skipped (missing name)</p>
              </div>
            )}

            {/* Duplicates warning */}
            {duplicates.length > 0 && (
              <div className="p-3 bg-yellow-500/10 rounded-md text-sm space-y-2">
                <div className="flex items-start gap-2 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{duplicates.length} guest(s) already exist in your guest list:</p>
                    <p className="mt-1">
                      {duplicates.slice(0, 5).join(', ')}
                      {duplicates.length > 5 && ` +${duplicates.length - 5} more`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-6">
                  <Checkbox 
                    id="import-duplicates" 
                    checked={importDuplicates}
                    onCheckedChange={(checked) => setImportDuplicates(checked === true)}
                  />
                  <Label htmlFor="import-duplicates" className="text-sm cursor-pointer">
                    Import duplicates anyway (creates new entries)
                  </Label>
                </div>
              </div>
            )}

            {/* Preview table */}
            <div className="flex-1 overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Plus One</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-12">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedGuests.slice(0, 100).map((guest) => (
                    <TableRow 
                      key={guest.rowNumber}
                      className={duplicates.includes(guest.name) && !importDuplicates ? 'opacity-50' : ''}
                    >
                      <TableCell className="text-muted-foreground">{guest.rowNumber}</TableCell>
                      <TableCell className="font-medium">{guest.name}</TableCell>
                      <TableCell>{guest.relationship}</TableCell>
                      <TableCell>{guest.priority}</TableCell>
                      <TableCell>{guest.plusOne}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{guest.address}</TableCell>
                      <TableCell>
                        {guest.status === 'valid' && !duplicates.includes(guest.name) && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {guest.status === 'warning' && (
                          <span title={guest.warnings.join(', ')}>
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          </span>
                        )}
                        {duplicates.includes(guest.name) && (
                          <span title="Duplicate guest">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedGuests.length > 100 && (
                <p className="text-xs text-muted-foreground p-2 text-center">
                  Showing first 100 of {parsedGuests.length} guests
                </p>
              )}
            </div>

            {/* Summary */}
            <p className="text-sm text-muted-foreground">
              Ready to import <strong>{guestsToImportCount}</strong> guest(s)
            </p>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Importing guests...</span>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={resetState}>
                Back
              </Button>
              <Button 
                onClick={handleImport}
                disabled={guestsToImportCount === 0}
              >
                Import {guestsToImportCount} Guest{guestsToImportCount !== 1 ? 's' : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
