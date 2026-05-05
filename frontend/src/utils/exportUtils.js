/**
 * Export data to CSV file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file to download
 */
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  // Get headers from the first object
  const headers = Object.keys(data[0])
  
  // Create CSV rows
  const csvRows = []
  
  // Add headers
  csvRows.push(headers.join(','))
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header]?.toString() || ''
      // Escape commas and quotes
      return `"${value.replace(/"/g, '""')}"`
    })
    csvRows.push(values.join(','))
  }
  
  // Combine into CSV string
  const csvString = csvRows.join('\n')
  
  // Create download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export data to JSON file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file to download
 */
export const exportToJSON = (data, filename) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  const jsonString = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename.replace('.csv', '.json'))
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}