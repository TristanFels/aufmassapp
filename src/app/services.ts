import { createDatabase } from "../data/database";
import { ProjectRepository } from "../data/projects";

export const projects = new ProjectRepository(createDatabase());
