// src/components/ui/Table.tsx
interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  className = '',
  loading = false,
  emptyMessage = 'No hay datos disponibles',
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7ca1eb] border-t-transparent" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <thead className="bg-[#7ca1eb] text-white">
          <tr>
            {columns.map((column, index) => (
              <th
                key={String(column.key)}
                className={`px-4 py-3 text-left font-bold border-black ${
                  index !== columns.length - 1 ? 'border-r-2' : ''
                } ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-t-2 border-black hover:bg-gray-50"
            >
              {columns.map((column, colIndex) => {
                const keyString = String(column.key);
                const value = keyString.includes('.') 
                ? keyString.split('.').reduce((obj, key) => obj?.[key], row as any)
                : row[column.key as keyof T];
                
                return (
                  <td
                    key={String(column.key)}
                    className={`px-4 py-3 border-black ${
                      colIndex !== columns.length - 1 ? 'border-r-2' : ''
                    } ${column.className || ''}`}
                  >
                    {column.render ? column.render(value, row) : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
