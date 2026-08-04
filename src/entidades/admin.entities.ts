import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Proyectos } from "./proyectos.entities";

@Entity('administradores')
export class Administradores {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 100 })
    nombre!: string;

    @Column({ type: 'varchar', length: 100 })
    apellido!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    correo!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    usuario!: string;

    @Column({ type: 'varchar', length: 255 })
    clave!: string;

    @Column({ type: 'json', nullable: true })
    permisos!: { superadmin: boolean, dashboard: boolean, productos: boolean, usuarios: boolean, almacen: boolean }

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    ultimoIngreso!: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    registro!: Date;

    @Column({ type: 'varchar', length: 4 })
    otp!: string;

    @Column({ type: 'varchar', length: 100 })
    avatar!: string

    @Column({ type: 'varchar', length: 100 })
    telefono!: string;
}