import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Administradores } from "./admin.entities";

@Entity('proyectos')
export class Proyectos {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 100 })
    nombre!: string;

    @Column({ type: 'varchar', length: 250 })
    descripcion!: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    registro!: Date;

    @ManyToOne(() => Administradores)
    @JoinColumn({ name: 'admin', referencedColumnName: 'id' })
    admin!: Administradores | number;

    @OneToMany(() => Usuarios, usuario => usuario.proyecto)
    usuarios!: Usuarios[];

    @OneToMany(() => Cargo, cargo => cargo.proyecto)
    cargo!: Cargo[];
}

@Entity('cargo')
export class Cargo {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 100 })
    nombre!: string;

    @OneToMany(() => Usuarios, (usuario) => usuario.cargo)
    usuarios!: Usuarios[];

    @ManyToOne(() => Proyectos, proyecto => proyecto.usuarios)
    @JoinColumn({ name: 'proyecto', referencedColumnName: 'id' })
    proyecto!: Proyectos;
}

@Entity('usuarios')
export class Usuarios {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 100 })
    nombre!: string;

    @Column({ type: 'varchar', length: 100 })
    apellido!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    cedula!: string;

    @Column({
        type: "json",
        nullable: true
    })
    embedding!: number[];

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    registro!: Date;

    @Column({ type: 'varchar', length: 250 })
    avatar!: string

    @Column({ type: 'varchar', length: 100 })
    telefono!: string;

    @ManyToOne(() => Administradores)
    @JoinColumn({ name: 'admin', referencedColumnName: 'id' })
    admin!: Administradores | number;

    @ManyToOne(() => Proyectos, proyecto => proyecto.usuarios)
    @JoinColumn({ name: 'proyecto', referencedColumnName: 'id' })
    proyecto!: Proyectos;

    @OneToMany(() => Asistencia, asistencia => asistencia.usuario)
    asistencias!: Asistencia[];

    @Column({ type: 'int', default: 1 })
    estado: number; //1 es habilitado, 2 desabilitado

    @ManyToOne(() => Cargo, cargo => cargo.usuarios)
    @JoinColumn({ name: 'cargo', referencedColumnName: 'id' })
    cargo!: Cargo;
}

@Entity('asistencia')
export class Asistencia {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Usuarios, usuario => usuario.asistencias, {
        onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'usuario', referencedColumnName: 'id' })
    usuario!: Usuarios | number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    registro!: Date;

    @Column({ type: 'json', nullable: true })
    ubicacion: { longitud: number, latitud: number }

    @Column({ type: 'int', default: 1 })
    tipo: number; //1 es entrada, 2 es salida, 3 incapacidad, 4 permiso

    @Column({ type: 'varchar', length: 250 })
    foto!: string;
}