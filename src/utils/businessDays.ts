/**
 * Utilitários de cálculo de dias úteis (Segunda a Sexta-feira)
 */

export interface BusinessDaysRange {
  startDate: Date;
  endDate: Date;
  days: Date[];
  formattedRange: string;
}

/**
 * Retorna se um dia é dia útil (Segunda a Sexta)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
}

/**
 * Calcula os 5 dias úteis anteriores à data de processamento.
 * @param referenceDate Data de processamento
 * @param includeReferenceDate Se verdadeiro, inclui a própria data se for dia útil
 */
export function getPrevious5BusinessDays(
  referenceDate: Date,
  includeReferenceDate: boolean = false
): BusinessDaysRange {
  const days: Date[] = [];
  const current = new Date(referenceDate);

  if (!includeReferenceDate) {
    // Começa no dia anterior
    current.setDate(current.getDate() - 1);
  }

  while (days.length < 5) {
    if (!isWeekend(current)) {
      // Adiciona cópia do dia com hora zerada
      const validDay = new Date(current);
      validDay.setHours(0, 0, 0, 0);
      days.unshift(validDay); // insere no início para ficar por ordem cronológica crescente
    }
    current.setDate(current.getDate() - 1);
  }

  const startDate = new Date(days[0]);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(days[days.length - 1]);
  endDate.setHours(23, 59, 59, 999);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return {
    startDate,
    endDate,
    days,
    formattedRange: `${formatDate(startDate)} a ${formatDate(endDate)}`
  };
}

/**
 * Verifica se uma data de recibo está dentro dos 5 dias úteis
 */
export function isWithinBusinessDays(
  receiptDate: Date,
  range: BusinessDaysRange
): boolean {
  const time = receiptDate.getTime();
  return time >= range.startDate.getTime() && time <= range.endDate.getTime();
}

/**
 * Verifica se uma data de recibo pertence ao ano corrente desde 1 de Janeiro
 */
export function isWithinCurrentYear(
  receiptDate: Date,
  referenceDate: Date,
  upToReferenceDate: boolean = true
): boolean {
  const year = referenceDate.getFullYear();
  const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0).getTime();
  
  const endLimit = upToReferenceDate
    ? new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 23, 59, 59, 999).getTime()
    : new Date(year, 11, 31, 23, 59, 59, 999).getTime();

  const receiptTime = receiptDate.getTime();
  return receiptTime >= startOfYear && receiptTime <= endLimit;
}
