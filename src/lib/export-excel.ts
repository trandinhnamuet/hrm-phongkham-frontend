import { toast } from 'sonner';

/** Một cột trong file xuất ra: tiêu đề + cách lấy giá trị từ một dòng dữ liệu. */
export interface ExcelColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
  /** Độ rộng cột tính theo số ký tự. Mặc định suy ra từ tiêu đề. */
  width?: number;
}

/**
 * Xuất mảng dữ liệu ra file .xlsx.
 *
 * Thư viện xlsx nặng vài trăm KB nên nạp động ngay tại đây: người dùng không bấm
 * xuất file thì không phải tải về.
 */
export async function exportToExcel<T>(
  rows: T[],
  columns: ExcelColumn<T>[],
  fileName: string,
  sheetName = 'Sheet1',
): Promise<void> {
  if (rows.length === 0) {
    toast.error('Không có dữ liệu để xuất');
    return;
  }

  try {
    const XLSX = await import('xlsx');

    const data = [
      columns.map(c => c.header),
      ...rows.map(r => columns.map(c => {
        const v = c.value(r);
        return v === null || v === undefined ? '' : v;
      })),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = columns.map(c => ({ wch: c.width ?? Math.max(12, c.header.length + 2) }));
    // Giữ hàng tiêu đề khi cuộn
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };

    const wb = XLSX.utils.book_new();
    // Excel giới hạn tên sheet 31 ký tự và cấm một số ký tự.
    XLSX.utils.book_append_sheet(wb, ws, sheetName.replace(/[\\/?*[\]:]/g, '').slice(0, 31));

    XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
    toast.success(`Đã xuất ${rows.length} dòng`);
  } catch (e: any) {
    toast.error(e?.message || 'Không xuất được file Excel');
  }
}

/** Ghép tên file có kèm mốc thời gian để tải nhiều lần không bị đè lên nhau. */
export function stampedFileName(prefix: string) {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${prefix}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}
