import fs from "fs/promises";
import path from "path";
import { Project, Payment, Collection, Lead, Referrer, Feedback } from "@/types/database";
import { User, Invitation, PasswordReset } from "@/types/auth";

const DATA_DIR = path.join(process.cwd(), "src/data");

async function readJsonFile<T>(filename: string): Promise<T[]> {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as T[];
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

async function writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export const db = {
  projects: {
    findMany: async (): Promise<Project[]> => readJsonFile<Project>("proyectos.json"),
    append: async (project: Project): Promise<void> => {
      const data = await readJsonFile<Project>("proyectos.json");
      data.push(project);
      await writeJsonFile("proyectos.json", data);
    },
    overwrite: async (projects: Project[]): Promise<void> => {
      await writeJsonFile("proyectos.json", projects);
    },
    update: async (id: string, updates: Partial<Project>): Promise<void> => {
      const data = await readJsonFile<Project>("proyectos.json");
      const index = data.findIndex((p) => p.id === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...updates };
        await writeJsonFile("proyectos.json", data);
      }
    }
  },
  payments: {
    findMany: async (): Promise<Payment[]> => readJsonFile<Payment>("pagos.json"),
    append: async (payment: Payment): Promise<void> => {
      const data = await readJsonFile<Payment>("pagos.json");
      data.push(payment);
      await writeJsonFile("pagos.json", data);
    },
    overwrite: async (payments: Payment[]): Promise<void> => {
      await writeJsonFile("pagos.json", payments);
    }
  },
  collections: {
    findMany: async (): Promise<Collection[]> => readJsonFile<Collection>("cobros.json"),
    append: async (collection: Collection): Promise<void> => {
      const data = await readJsonFile<Collection>("cobros.json");
      data.push(collection);
      await writeJsonFile("cobros.json", data);
    },
    overwrite: async (collections: Collection[]): Promise<void> => {
      await writeJsonFile("cobros.json", collections);
    }
  },
  leads: {
    findMany: async (): Promise<Lead[]> => readJsonFile<Lead>("leads.json"),
    append: async (lead: Lead): Promise<void> => {
      const data = await readJsonFile<Lead>("leads.json");
      data.push(lead);
      await writeJsonFile("leads.json", data);
    },
    overwrite: async (leads: Lead[]): Promise<void> => {
      await writeJsonFile("leads.json", leads);
    }
  },
  referrers: {
    findMany: async (): Promise<Referrer[]> => readJsonFile<Referrer>("referidores.json"),
    append: async (referrer: Referrer): Promise<void> => {
      const data = await readJsonFile<Referrer>("referidores.json");
      data.push(referrer);
      await writeJsonFile("referidores.json", data);
    },
    overwrite: async (referrers: Referrer[]): Promise<void> => {
      await writeJsonFile("referidores.json", referrers);
    },
    update: async (id: string, updates: Partial<Referrer>): Promise<void> => {
      const data = await readJsonFile<Referrer>("referidores.json");
      const index = data.findIndex((r) => r.id === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...updates };
        await writeJsonFile("referidores.json", data);
      }
    },
    delete: async (id: string): Promise<void> => {
      const data = await readJsonFile<Referrer>("referidores.json");
      const filtered = data.filter((r) => r.id !== id);
      await writeJsonFile("referidores.json", filtered);
    }
  },
  feedback: {
    findMany: async (): Promise<Feedback[]> => readJsonFile<Feedback>("feedback.json"),
    append: async (fb: Feedback): Promise<void> => {
      const data = await readJsonFile<Feedback>("feedback.json");
      data.push(fb);
      await writeJsonFile("feedback.json", data);
    },
    overwrite: async (feedback: Feedback[]): Promise<void> => {
      await writeJsonFile("feedback.json", feedback);
    }
  },
  users: {
    findMany: async (): Promise<User[]> => readJsonFile<User>("usuarios.json"),
    findByEmail: async (email: string): Promise<User | null> => {
      const users = await readJsonFile<User>("usuarios.json");
      return users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
    },
    findById: async (id: string): Promise<User | null> => {
      const users = await readJsonFile<User>("usuarios.json");
      return users.find((u) => u.id === id) || null;
    },
    append: async (user: User): Promise<void> => {
      const data = await readJsonFile<User>("usuarios.json");
      data.push(user);
      await writeJsonFile("usuarios.json", data);
    },
    update: async (id: string, updates: Partial<User>): Promise<void> => {
      const data = await readJsonFile<User>("usuarios.json");
      const index = data.findIndex((u) => u.id === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...updates };
        await writeJsonFile("usuarios.json", data);
      }
    },
    delete: async (id: string): Promise<void> => {
      const data = await readJsonFile<User>("usuarios.json");
      const filtered = data.filter((u) => u.id !== id);
      await writeJsonFile("usuarios.json", filtered);
    }
  },
  invitations: {
    findMany: async (): Promise<Invitation[]> => readJsonFile<Invitation>("invitaciones.json"),
    findByToken: async (token: string): Promise<Invitation | null> => {
      const invs = await readJsonFile<Invitation>("invitaciones.json");
      return invs.find((inv) => inv.token === token) || null;
    },
    append: async (invitation: Invitation): Promise<void> => {
      const data = await readJsonFile<Invitation>("invitaciones.json");
      data.push(invitation);
      await writeJsonFile("invitaciones.json", data);
    },
    update: async (id: string, updates: Partial<Invitation>): Promise<void> => {
      const data = await readJsonFile<Invitation>("invitaciones.json");
      const index = data.findIndex((inv) => inv.id === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...updates };
        await writeJsonFile("invitaciones.json", data);
      }
    }
  },
  passwordResets: {
    findMany: async (): Promise<PasswordReset[]> => readJsonFile<PasswordReset>("recuperaciones.json"),
    findByToken: async (token: string): Promise<PasswordReset | null> => {
      const resets = await readJsonFile<PasswordReset>("recuperaciones.json");
      return resets.find((r) => r.token === token) || null;
    },
    append: async (reset: PasswordReset): Promise<void> => {
      const data = await readJsonFile<PasswordReset>("recuperaciones.json");
      data.push(reset);
      await writeJsonFile("recuperaciones.json", data);
    },
    update: async (id: string, updates: Partial<PasswordReset>): Promise<void> => {
      const data = await readJsonFile<PasswordReset>("recuperaciones.json");
      const index = data.findIndex((r) => r.id === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...updates };
        await writeJsonFile("recuperaciones.json", data);
      }
    }
  }
};
