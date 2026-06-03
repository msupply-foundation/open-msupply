import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import Grid from '@mui/material/Grid2';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Portal from '@mui/material/Portal';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
// Cheap MUI table primitives — re-exported from common because they're
// used by a handful of callers (RnR form, inbound line edit modal).
// These are tiny @mui/material re-exports and don't pull in MRT.
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { TableCellProps } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
export {
  Table,
  TableBody,
  TableCell,
  TableCellProps,
  TableContainer,
  TableHead,
  TableRow,
};
export * from './skeletons';
// Note: the MRT-using `./tables` barrel (MaterialTable, the table hooks,
// cell components) is intentionally NOT re-exported here. It would pull
// material-react-table (~213KB) into the federation-shared common bundle,
// hitting /login and every other page. Consumers import those from
// '@common/tables' instead, which resolves to the same files but with a
// different import-request string that bypasses module-federation share.

export {
  Box,
  Container,
  Drawer,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Portal,
  Stack,
  Toolbar,
};
