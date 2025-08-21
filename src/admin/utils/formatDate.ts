/**
 * Định dạng một chuỗi ngày tháng từ 'DDMMYYYY' sang 'DD/MM/YYYY'.
 * @param dateStr Chuỗi ngày tháng đầu vào (ví dụ: '02091968').
 * @returns Chuỗi đã được định dạng (ví dụ: '02/09/1968') hoặc một chuỗi rỗng nếu đầu vào không hợp lệ.
 */
export function formatDDMMYYYY(dateStr: string): string {
    // 1. Kiểm tra xem chuỗi đầu vào có hợp lệ không (không null và dài 8 ký tự)
    if (!dateStr || dateStr.length !== 8) {
        console.error('Chuỗi ngày tháng không hợp lệ. Cần có định dạng DDMMYYYY.');
        return ''; // Trả về chuỗi rỗng nếu không hợp lệ
    }

    // 2. Tách chuỗi thành các phần ngày, tháng, năm
    const day = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 4);
    const year = dateStr.substring(4, 8);

    // 3. Nối các phần lại với nhau bằng dấu '/'
    return `${day}/${month}/${year}`;
}

/**
 * Lấy ngày, tháng, năm hiện tại dưới dạng số.
 * @returns Một object gồm { day, month, year }
 */
export function getCurrentDateParts() {
    const today = new Date();

    const day = today.getDate(); // Ngày (1 - 31)
    const month = today.getMonth() + 1; // Tháng (0 - 11) → cần +1
    const year = today.getFullYear(); // Năm (yyyy)

    return { day, month, year };
}

// --- Cách sử dụng ---
const { day, month, year } = getCurrentDateParts();
console.log('Ngày:', day); // 20
console.log('Tháng:', month); // 8
console.log('Năm:', year); // 2025

// --- Cách sử dụng ---
const inputDate = '02091968';
const formattedDate = formatDDMMYYYY(inputDate);

console.log(formattedDate); // Kết quả: "02/09/1968"

// Ví dụ với đầu vào không hợp lệ
const invalidInput = '12345';
console.log(formatDDMMYYYY(invalidInput)); // Kết quả: "" và log lỗi ra console
