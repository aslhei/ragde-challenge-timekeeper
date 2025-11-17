import * as XLSX from 'xlsx';
import { RaceResult, Person } from '../types';
import { storage } from '../storage';
import { formatTimeHMS, formatTreadmillPace, formatPacePer500m, formatRowingPace } from './timeFormat';

export function exportToExcel() {
  const results = storage.getAllResults();
  const persons = storage.getPersons();

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Results
  const resultsData = results.map((result, index) => {
    const treadmillSplit = result.splits.find(s => s.discipline === 'treadmill');
    const skiErgSplit = result.splits.find(s => s.discipline === 'skiErg');
    const rowingSplit = result.splits.find(s => s.discipline === 'rowing');

    return {
      'Rank': index + 1,
      'Person Name': result.personName,
      'Person ID': result.personId,
      'Treadmill Time': treadmillSplit ? formatTimeHMS(treadmillSplit.time) : '-',
      'Treadmill Time (ms)': treadmillSplit ? treadmillSplit.time : 0,
      'Treadmill Pace': treadmillSplit ? formatTreadmillPace(treadmillSplit.time) : '-',
      'SkiErg Time': skiErgSplit ? formatTimeHMS(skiErgSplit.time) : '-',
      'SkiErg Time (ms)': skiErgSplit ? skiErgSplit.time : 0,
      'SkiErg Pace': skiErgSplit ? formatPacePer500m(skiErgSplit.time) : '-',
      'Rowing Time': rowingSplit ? formatTimeHMS(rowingSplit.time) : '-',
      'Rowing Time (ms)': rowingSplit ? rowingSplit.time : 0,
      'Rowing Pace': rowingSplit ? formatRowingPace(rowingSplit.time) : '-',
      'Total Time': formatTimeHMS(result.totalTime),
      'Total Time (ms)': result.totalTime,
      'Completed At': new Date(result.completedAt).toISOString(),
      'Result ID': result.id,
    };
  });

  const resultsSheet = XLSX.utils.json_to_sheet(resultsData);
  XLSX.utils.book_append_sheet(workbook, resultsSheet, 'Results');

  // Sheet 2: Persons
  const personsData = persons.map(person => ({
    'Name': person.name,
    'ID': person.id,
    'Created At': person.createdAt,
  }));

  const personsSheet = XLSX.utils.json_to_sheet(personsData);
  XLSX.utils.book_append_sheet(workbook, personsSheet, 'Persons');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const filename = `ragde-challenge-backup-${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, filename);
}

export function importFromExcel(file: File): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Read Results sheet
        const resultsSheet = workbook.Sheets['Results'];
        if (!resultsSheet) {
          resolve({ success: false, message: 'Results sheet not found in file' });
          return;
        }

        const resultsData: any[] = XLSX.utils.sheet_to_json(resultsSheet);
        
        // Read Persons sheet
        const personsSheet = workbook.Sheets['Persons'];
        let personsData: any[] = [];
        if (personsSheet) {
          personsData = XLSX.utils.sheet_to_json(personsSheet);
        }

        // Import persons first
        const existingPersons = storage.getPersons();
        const existingPersonIds = new Set(existingPersons.map(p => p.id));

        personsData.forEach((personRow: any) => {
          if (personRow.ID && personRow.Name) {
            // Only add if person doesn't exist
            if (!existingPersonIds.has(personRow.ID)) {
              const person: Person = {
                id: personRow.ID,
                name: personRow.Name,
                createdAt: personRow['Created At'] || new Date().toISOString(),
              };
              storage.savePerson(person);
            }
          }
        });

        // Import results
        const existingResults = storage.getResults();
        const existingResultIds = new Set(existingResults.map(r => r.id));
        let importedCount = 0;
        let skippedCount = 0;

        resultsData.forEach((row: any) => {
          if (!row['Result ID'] || !row['Person Name']) {
            return;
          }

          // Skip if result already exists
          if (existingResultIds.has(row['Result ID'])) {
            skippedCount++;
            return;
          }

          // Reconstruct splits
          const splits = [];
          if (row['Treadmill Time (ms)'] && row['Treadmill Time (ms)'] > 0) {
            splits.push({
              discipline: 'treadmill' as const,
              time: row['Treadmill Time (ms)'],
              timestamp: new Date().toISOString(),
            });
          }
          if (row['SkiErg Time (ms)'] && row['SkiErg Time (ms)'] > 0) {
            splits.push({
              discipline: 'skiErg' as const,
              time: row['SkiErg Time (ms)'],
              timestamp: new Date().toISOString(),
            });
          }
          if (row['Rowing Time (ms)'] && row['Rowing Time (ms)'] > 0) {
            splits.push({
              discipline: 'rowing' as const,
              time: row['Rowing Time (ms)'],
              timestamp: new Date().toISOString(),
            });
          }

          // Find or create person
          let personId = row['Person ID'];
          if (!personId) {
            // Try to find by name
            const person = storage.getPersons().find(p => p.name === row['Person Name']);
            if (person) {
              personId = person.id;
            } else {
              // Create new person
              const newPerson = storage.createPerson(row['Person Name']);
              personId = newPerson.id;
            }
          }

          const result: RaceResult = {
            id: row['Result ID'],
            personId: personId,
            personName: row['Person Name'],
            splits,
            totalTime: row['Total Time (ms)'] || 0,
            completedAt: row['Completed At'] || new Date().toISOString(),
          };

          storage.saveResult(result);
          importedCount++;
        });

        resolve({
          success: true,
          message: `Import successful! Imported ${importedCount} results${skippedCount > 0 ? `, skipped ${skippedCount} duplicates` : ''}.`,
        });
      } catch (error) {
        resolve({
          success: false,
          message: `Error importing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        message: 'Error reading file',
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

