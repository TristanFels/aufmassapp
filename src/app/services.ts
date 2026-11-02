import { createDatabase } from "../data/database";
import { ProjectRepository } from "../data/projects";
import { MaterialRepository } from "../data/materials";

const database = createDatabase();
export const projects = new ProjectRepository(database);
export const materials = new MaterialRepository(database);
