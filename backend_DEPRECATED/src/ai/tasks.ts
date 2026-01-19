export interface Task {
  description: string;
  subtotal: number;
}

export async function generateTasks(
  description: string,
  professionId: number,
): Promise<Task[]> {
  // Mock implementation for now
  if (description.toLowerCase().includes("chave simples") || description.toLowerCase().includes("cópia")) {
      return [
          { description: "Cópia de chave simples", subtotal: 15.00 }
      ];
  }

  return [
    { description: "Avaliação inicial", subtotal: 50.0 },
    { description: "Mão de obra", subtotal: 100.0 },
  ];
}
