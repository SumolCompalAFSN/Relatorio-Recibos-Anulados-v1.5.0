import { SellerTemplate } from '../types';

/**
 * Base de Vendedores e Gestores de Território (GT) predefinida
 * Baseada na estrutura comercial e nos exemplos dos requisitos.
 * Os códigos são estritamente tratados como texto (ex: "001", "049", "G04").
 */
export const DEFAULT_SELLERS_TEMPLATE: SellerTemplate[] = [
  // GT: Jorge Rodrigues
  { codigo: '005', nomeVendedor: 'Nuno Almeida', email: 'nuno.almeida@sumolcompal.pt', nomeGt: 'Jorge Rodrigues', emailGt: 'jorge.rodrigues@sumolcompal.pt' },
  { codigo: '008', nomeVendedor: 'Pedro Santos', email: 'pedro.santos@sumolcompal.pt', nomeGt: 'Jorge Rodrigues', emailGt: 'jorge.rodrigues@sumolcompal.pt' },
  { codigo: '049', nomeVendedor: 'Tiago Oliveira', email: 'tiago.oliveira@sumolcompal.pt', nomeGt: 'Jorge Rodrigues', emailGt: 'jorge.rodrigues@sumolcompal.pt' },
  { codigo: '072', nomeVendedor: 'Carla Moreira', email: 'carla.moreira@sumolcompal.pt', nomeGt: 'Jorge Rodrigues', emailGt: 'jorge.rodrigues@sumolcompal.pt' },
  { codigo: 'G04', nomeVendedor: 'Gonçalo Matos', email: 'goncalo.matos@sumolcompal.pt', nomeGt: 'Jorge Rodrigues', emailGt: 'jorge.rodrigues@sumolcompal.pt' },

  // GT: Agostinho Lopes
  { codigo: '001', nomeVendedor: 'Helder Barbosa', email: 'helder.barbosa@sumolcompal.pt', nomeGt: 'Agostinho Lopes', emailGt: 'agostinho.lopes@sumolcompal.pt' },
  { codigo: '002', nomeVendedor: 'Ana Ribeiro', email: 'ana.ribeiro@sumolcompal.pt', nomeGt: 'Agostinho Lopes', emailGt: 'agostinho.lopes@sumolcompal.pt' },
  { codigo: '011', nomeVendedor: 'João Silva', email: 'joao.silva@sumolcompal.pt', nomeGt: 'Agostinho Lopes', emailGt: 'agostinho.lopes@sumolcompal.pt' },
  { codigo: '025', nomeVendedor: 'Ana Costa', email: 'ana.costa@sumolcompal.pt', nomeGt: 'Agostinho Lopes', emailGt: 'agostinho.lopes@sumolcompal.pt' },
  { codigo: '033', nomeVendedor: 'Marta Ferreira', email: 'marta.ferreira@sumolcompal.pt', nomeGt: 'Agostinho Lopes', emailGt: 'agostinho.lopes@sumolcompal.pt' },
  { codigo: 'G01', nomeVendedor: 'Diogo Martins', email: 'diogo.martins@sumolcompal.pt', nomeGt: 'Agostinho Lopes', emailGt: 'agostinho.lopes@sumolcompal.pt' },

  // GT: Rui Santos
  { codigo: '019', nomeVendedor: 'Manuel Sousa', email: 'manuel.sousa@sumolcompal.pt', nomeGt: 'Rui Santos', emailGt: 'rui.santos@sumolcompal.pt' },
  { codigo: '042', nomeVendedor: 'Sofia Mendes', email: 'sofia.mendes@sumolcompal.pt', nomeGt: 'Rui Santos', emailGt: 'rui.santos@sumolcompal.pt' },
  { codigo: '088', nomeVendedor: 'Filipe Carvalho', email: 'filipe.carvalho@sumolcompal.pt', nomeGt: 'Rui Santos', emailGt: 'rui.santos@sumolcompal.pt' },
  { codigo: '135', nomeVendedor: 'Beatriz Pinto', email: 'beatriz.pinto@sumolcompal.pt', nomeGt: 'Rui Santos', emailGt: 'rui.santos@sumolcompal.pt' },
  { codigo: 'G12', nomeVendedor: 'Ricardo Neves', email: 'ricardo.neves@sumolcompal.pt', nomeGt: 'Rui Santos', emailGt: 'rui.santos@sumolcompal.pt' },

  // GT: Patrícia Gonçalves
  { codigo: '014', nomeVendedor: 'António Ferreira', email: 'antonio.ferreira@sumolcompal.pt', nomeGt: 'Patrícia Gonçalves', emailGt: 'patricia.goncalves@sumolcompal.pt' },
  { codigo: '028', nomeVendedor: 'Inês Lourenço', email: 'ines.lourenco@sumolcompal.pt', nomeGt: 'Patrícia Gonçalves', emailGt: 'patricia.goncalves@sumolcompal.pt' },
  { codigo: '061', nomeVendedor: 'Bruno Teixeira', email: 'bruno.teixeira@sumolcompal.pt', nomeGt: 'Patrícia Gonçalves', emailGt: 'patricia.goncalves@sumolcompal.pt' },
  { codigo: '103', nomeVendedor: 'Catarina Pires', email: 'catarina.pires@sumolcompal.pt', nomeGt: 'Patrícia Gonçalves', emailGt: 'patricia.goncalves@sumolcompal.pt' },

  // GT: Carlos Vieira
  { codigo: '007', nomeVendedor: 'Vasco Ramos', email: 'vasco.ramos@sumolcompal.pt', nomeGt: 'Carlos Vieira', emailGt: 'carlos.vieira@sumolcompal.pt' },
  { codigo: '031', nomeVendedor: 'Leonor Antunes', email: 'leonor.antunes@sumolcompal.pt', nomeGt: 'Carlos Vieira', emailGt: 'carlos.vieira@sumolcompal.pt' },
  { codigo: '055', nomeVendedor: 'André Machado', email: 'andre.machado@sumolcompal.pt', nomeGt: 'Carlos Vieira', emailGt: 'carlos.vieira@sumolcompal.pt' },
  { codigo: 'G07', nomeVendedor: 'Sara Fonseca', email: 'sara.fonseca@sumolcompal.pt', nomeGt: 'Carlos Vieira', emailGt: 'carlos.vieira@sumolcompal.pt' }
];

export const FIXED_CC_EMAILS = [
  'Paulo.Cordeiro@sumolcompal.pt',
  'Luis.Carril@sumolcompal.pt',
  'fernando.coimbra@sumolcompal.pt'
];
