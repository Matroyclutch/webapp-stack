import { useMemo, useRef, useState } from 'react'
import './App.css'

type Message = { type: 'success' | 'error'; text: string } | null

type FileItem = {
  name: string
  size: number
  file: File
}

export default function App() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [message, setMessage] = useState<Message>(null)
  const [submitting, setSubmitting] = useState(false)
  const envApi = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const inferredApi =
    typeof window !== 'undefined' && window.location.hostname.endsWith('pages.dev')
      ? 'https://webapp-stack.onrender.com'
      : ''
  const apiBase = envApi || inferredApi
  const submitUrl = apiBase ? `${apiBase}/submit` : '/submit'

  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files]
  )

  const onFilesAdded = (newFiles: FileList | null) => {
    if (!newFiles) return
    const next: FileItem[] = []
    Array.from(newFiles).forEach((file) => {
      if (!files.some((f) => f.name === file.name && f.size === file.size)) {
        next.push({ name: file.name, size: file.size, file })
      }
    })
    if (next.length > 0) setFiles((prev) => [...prev, ...next])
  }

  const removeFile = (name: string, size: number) => {
    setFiles((prev) => prev.filter((f) => !(f.name === name && f.size === size)))
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    onFilesAdded(e.dataTransfer.files)
  }

  const openDatePicker = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void }
    if (typeof el.showPicker === 'function') {
      el.showPicker()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return

    setSubmitting(true)
    setMessage(null)

    try {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 25000)

      const fd = new FormData(formRef.current)
      files.forEach((f) => fd.append('files', f.file))

      const res = await fetch(submitUrl, {
        method: 'POST',
        body: fd,
        signal: controller.signal,
      })
      window.clearTimeout(timeoutId)

      if (!res.ok) {
        let detail = `Server error: ${res.status}`
        try {
          const data = await res.json()
          if (data?.message) detail = data.message
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(detail)
      }

      setMessage({
        type: 'success',
        text: 'Request submitted successfully! You will receive an email shortly.',
      })
      formRef.current.reset()
      setFiles([])
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'AbortError'
          ? 'Submission is taking too long. Please try again.'
          : err instanceof Error
            ? err.message
            : 'Submission failed. Please try again.'
      setMessage({ type: 'error', text: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-shell">
      <div className="card-shell bg-white shadow-2xl rounded-2xl p-6 sm:p-10">
        <header className="text-center mb-8 border-b pb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-clutch-dark tracking-tight">
            Clutch Technologies Inc Arbitration Request Form
          </h1>
          <p className="text-lg text-gray-500 mt-2">Clutch Vehicle Dispute Resolution</p>
          <p className="text-sm text-red-600 mt-1 font-semibold">
            *Must be submitted within the policy&apos;s mandatory arbitration period (typically
            2-7 business days).*
          </p>
        </header>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          action={submitUrl}
          method="post"
          encType="multipart/form-data"
        >
          <div className="section-header">
            <h2 className="text-2xl font-bold text-clutch-primary">
              1. Claimant/Dealer Information
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label htmlFor="dealerName">Dealer Name (Claimant):</label>
              <input type="text" id="dealerName" name="dealerName" required className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="dealerAcct">Clutch Account/Dealer #: (Required)</label>
              <input type="text" id="dealerAcct" name="dealerAcct" required className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="contactName">Primary Contact Name:</label>
              <input type="text" id="contactName" name="contactName" required className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="contactEmail">Contact Email:</label>
              <input type="email" id="contactEmail" name="contactEmail" required className="form-input" />
            </div>
            <div className="form-group md:col-span-2">
              <label htmlFor="contactPhone">Contact Phone Number:</label>
              <input type="tel" id="contactPhone" name="contactPhone" required className="form-input" />
            </div>
          </div>

          <div className="section-header">
            <h2 className="text-2xl font-bold text-clutch-primary">2. Vehicle &amp; Sale Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="form-group">
              <label htmlFor="vin">Vehicle VIN (17 digits):</label>
              <input
                type="text"
                id="vin"
                name="vin"
                maxLength={17}
                required
                className="form-input uppercase"
              />
            </div>
            <div className="form-group">
              <label htmlFor="stockNumber">Stock/Lot Number:</label>
              <input type="text" id="stockNumber" name="stockNumber" className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="purchaseDate">Date of Purchase/Sale:</label>
              <input
                type="date"
                id="purchaseDate"
                name="purchaseDate"
                required
                className="form-input"
                onClick={openDatePicker}
                onFocus={openDatePicker}
              />
            </div>
            <div className="form-group">
              <label htmlFor="pickupDate">Date of Physical Pickup/Delivery:</label>
              <input
                type="date"
                id="pickupDate"
                name="pickupDate"
                required
                className="form-input"
                onClick={openDatePicker}
                onFocus={openDatePicker}
              />
            </div>
            <div className="form-group">
              <label htmlFor="odometerReading">Odometer Reading at Pickup (KM/Miles):</label>
              <input
                type="number"
                id="odometerReading"
                name="odometerReading"
                required
                className="form-input"
              />
            </div>
            <div className="form-group md:col-span-3">
              <label htmlFor="salePrice">Final Sale Price (Excluding Fees):</label>
              <input
                type="number"
                id="salePrice"
                name="salePrice"
                step="0.01"
                required
                className="form-input"
                placeholder="e.g., 8500.00"
              />
            </div>
          </div>

          <div className="section-header">
            <h2 className="text-2xl font-bold text-clutch-primary">3. Claim Details</h2>
          </div>

          <div className="form-group mb-6">
            <label className="mb-2">Type of Arbitration Claim:</label>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              {[
                'Major Mechanical Failure',
                'Undisclosed Structural/Frame Damage',
                'Title/Odometer/VIN Discrepancy',
                'Other',
              ].map((value) => (
                <label key={value} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="claimType"
                    value={value}
                    required
                    className="radio-input"
                  />
                  <span className="ml-2">{value === 'Other' ? 'Other (Specify below)' : value}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="form-group">
              <label htmlFor="defectArea">
                Specific Area of Defect (e.g., Transmission, Engine, Frame Rail):
              </label>
              <input type="text" id="defectArea" name="defectArea" required className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="repairCost">Estimated Wholesale Repair Cost:</label>
              <input
                type="number"
                id="repairCost"
                name="repairCost"
                step="0.01"
                required
                className="form-input"
                placeholder="Must meet policy threshold (e.g., $750)"
              />
            </div>
          </div>

          <div className="form-group mb-6">
            <label htmlFor="defectDescription">Detailed Description of Undisclosed Defect/Issue:</label>
            <textarea
              id="defectDescription"
              name="defectDescription"
              rows={5}
              required
              className="form-textarea"
              placeholder="Enter your notes here."
            ></textarea>
          </div>

          <div className="section-header">
            <h2 className="text-2xl font-bold text-clutch-primary">
              4. Policy Compliance &amp; Documentation
            </h2>
          </div>

          <div className="space-y-3 bg-clutch-light p-4 rounded-lg border border-clutch-primary/50 mb-6">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="declaration1"
                required
                className="mt-1 h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="declaration1" className="ml-3 text-sm font-medium text-gray-700">
                I confirm this request is being submitted within the required arbitration timeframe (e.g., 2 or 7
                calendar days of pickup).
              </label>
            </div>
            <div className="flex items-start">
              <input
                type="checkbox"
                id="declaration2"
                required
                className="mt-1 h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="declaration2" className="ml-3 text-sm font-medium text-gray-700">
                I confirm the issue was UNDISCLOSED by the Seller, Condition Report, or Vehicle History Report.
              </label>
            </div>
            <div className="flex items-start">
              <input
                type="checkbox"
                id="declaration5"
                required
                className="mt-1 h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="declaration5" className="ml-3 text-sm font-medium text-gray-700">
                I understand that I am responsible for the inspection and transport fees if issues are found to not be
                part of arbitration.
              </label>
            </div>
          </div>

          <div className="form-group mb-6">
            <label className="mb-2">Upload Supporting Documentation &amp; Photos:</label>
            <div
              id="dropZone"
              className="drop-zone relative rounded-xl p-8 text-center bg-gray-50 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.classList.add('drag-over')
              }}
              onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
              onDrop={(e) => {
                e.currentTarget.classList.remove('drag-over')
                handleDrop(e)
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                name="files"
                multiple
                className="hidden"
                onChange={(e) => onFilesAdded(e.target.files)}
              />
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
                <p className="text-sm text-gray-600">
                  <span className="font-bold text-clutch-primary">Click to upload</span> or drag and drop files here
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF, or DOCX (Max 10MB each)</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {files.map((f) => (
                <div
                  key={`${f.name}-${f.size}`}
                  className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                >
                  <div className="flex items-center truncate mr-2">
                    <span className="truncate">{f.name}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {(f.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 font-bold"
                    onClick={() => removeFile(f.name, f.size)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {files.length > 0 && (
                <div className="text-xs text-gray-500">Total: {(totalSize / 1024 / 1024).toFixed(2)} MB</div>
              )}
            </div>
          </div>

          <div className="section-header">
            <h2 className="text-2xl font-bold text-clutch-primary">5. Acknowledgment</h2>
          </div>

          <div className="form-group mb-6">
            <label htmlFor="signature">Digital Signature (Type Full Name):</label>
            <input type="text" id="signature" name="signature" required className="form-input" placeholder="Type your full name" />
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg text-center font-semibold mb-6 ${
                message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-6 border-t">
            <button
              type="reset"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-150"
              onClick={() => {
                setFiles([])
                setMessage(null)
              }}
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-clutch-primary text-white font-bold rounded-lg shadow-md hover:bg-clutch-dark transition duration-150 transform hover:scale-[1.01]"
            >
              {submitting ? 'Submitting...' : 'Submit Arbitration Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
