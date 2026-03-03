/**
 * Handles Excel file reading using SheetJS
 */
const excelReader = {
  parseFile: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Validate data structure
          if (jsonData.length === 0) {
            reject(new Error("Excel file is empty"));
            return;
          }

          const requiredColumns = [
            "Page URL",
            "Image URL",
            "Pin Title",
            "Description",
            "Board",
          ];
          const firstRow = jsonData[0];
          const missingColumns = requiredColumns.filter(
            (col) => !(col in firstRow),
          );

          if (missingColumns.length > 0) {
            reject(new Error(`Missing columns: ${missingColumns.join(", ")}`));
            return;
          }

          // Map to internal format for consistency
          const mappedData = jsonData.map((row) => ({
            title: row["Pin Title"],
            description: row["Description"],
            image_url: row["Image URL"],
            link: row["Page URL"],
            board: row["Board"],
          }));

          resolve(mappedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  },
};

window.excelReader = excelReader;
